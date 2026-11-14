"""Kill a real grading process and verify PostgreSQL recovery in a disposable schema.

The inference callable is deliberately simulated. This proves queue durability and
result persistence, not Whisper accuracy, speaker identity or exam capacity.
"""
import argparse
from datetime import datetime, timezone
from io import BytesIO
import json
import multiprocessing
import os
from pathlib import Path
import re
import time
import uuid
import wave


def require_staging():
    from scripts.load_test_prepare import require_load_database
    if os.environ.get("LOAD_TEST_ENABLED") != "1":
        raise ValueError("Recovery checks require LOAD_TEST_ENABLED=1")
    require_load_database(os.environ.get("DATABASE_URL", ""))


def database(schema):
    # Never let this script's cleanup target a caller-supplied or shared schema.
    if not re.fullmatch(r"recovery_smoke_[0-9a-f]{32}", schema):
        raise ValueError("Invalid disposable schema")
    require_staging()
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(os.environ["DATABASE_URL"], pool_size=2, max_overflow=0,
                           connect_args={"options": f"-csearch_path={schema}", "connect_timeout": 10})
    return engine, sessionmaker(bind=engine, autoflush=False)


def audio_fixture():
    stream = BytesIO()
    with wave.open(stream, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(b"\0\0" * 16000)
    return stream.getvalue()


def simulated_pipeline(audio_path, *_):
    if Path(audio_path).read_bytes() != audio_fixture():
        raise RuntimeError("Stored fixture audio changed")
    return {"transcript": "SIMULATED RECOVERY FIXTURE", "nlp_score": 80.0,
            "speech_score": 90.0, "voice_score": None, "fluency_report": None,
            "cheat_report": None}


def child_worker(schema, connection, block):
    engine = None
    try:
        import app.models  # register relationships in the fresh spawned interpreter
        from app.worker import Worker
        engine, factory = database(schema)

        def pipeline(*args):
            result = simulated_pipeline(*args)
            if block:
                from app.core.media_limits import decode_audio_bounded
                connection.send({"phase": "inference_started", "audio_path": args[0],
                                 "decoded_samples": len(decode_audio_bounded(args[0]))})
                while True:
                    time.sleep(1)
            return result

        worker = Worker(factory, concurrency=1, pipeline=pipeline)
        if block:
            worker.run_one(0)
        else:
            worker.maintenance()
            outcomes = [worker.run_one(0), worker.run_one(0)]
            connection.send({"phase": "replacement_finished", "outcomes": outcomes})
    except Exception as error:
        connection.send({"phase": "error", "error_type": type(error).__name__})
        raise SystemExit(1) from None
    finally:
        if engine:
            engine.dispose()
        connection.close()


def receive(connection, timeout=30):
    if not connection.poll(timeout):
        raise RuntimeError("Worker did not reach the expected checkpoint")
    message = connection.recv()
    if message.get("phase") == "error":
        raise RuntimeError("Worker checkpoint failed: " + message["error_type"])
    return message


def run():
    require_staging()  # before model registration, DB imports or any mutation
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import undefer
    import app.models
    from app.core.database import Base
    from app.models.exam_submission import ExamSubmission
    from app.models.grading_job import GradingJob
    from app.models.question import Question
    from app.models.user import User
    from app.services import grading_queue as queue

    schema = "recovery_smoke_" + uuid.uuid4().hex
    admin = create_engine(os.environ["DATABASE_URL"], pool_size=1, max_overflow=0)
    engine, factory = database(schema)
    context = multiprocessing.get_context("spawn")
    children, connections = [], []
    checks = {}
    created = False
    started = time.monotonic()
    previous = {key: os.environ.get(key) for key in
                ("GRADING_STALE_SECONDS", "GRADING_HEARTBEAT_SECONDS", "GRADING_MAX_ATTEMPTS")}
    # Only these spawned test workers see accelerated leases; no running service is changed.
    os.environ.update(GRADING_STALE_SECONDS="5", GRADING_HEARTBEAT_SECONDS="1", GRADING_MAX_ATTEMPTS="3")
    try:
        with admin.begin() as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
        created = True
        Base.metadata.create_all(engine)
        with factory() as db:
            user = User(email=f"{schema}@loadtest.example.com", full_name="Recovery fixture",
                        role="student", hashed_password="disabled-test-only", is_active=False)
            db.add(user)
            db.flush()
            for index in range(2):
                question = Question(text=f"Recovery fixture {index + 1}", model_answer="fixture",
                                    results_policy="immediate")
                db.add(question)
                db.flush()
                submission = ExamSubmission(question_id=question.id, student_id=user.id,
                                            submission_key=f"{schema}-{index}", grade_visible=0)
                db.add(submission)
                queue.enqueue(db, submission, audio=audio_fixture(), audio_suffix=".wav",
                              anti_cheat_alerts="{}", voice_embedding=None, has_faceprint=False, priority=0)
            db.commit()

        parent, child = context.Pipe()
        connections.extend([parent, child])
        original = context.Process(target=child_worker, args=(schema, child, True))
        children.append(original)
        original.start()
        checkpoint = receive(parent)
        assert checkpoint["phase"] == "inference_started"
        checks["anonymous_recording_decoded"] = (checkpoint["audio_path"].startswith("/proc/self/fd/")
                                                   and checkpoint["decoded_samples"] == 16000)
        descriptor = Path("/proc") / str(original.pid) / "fd" / Path(checkpoint["audio_path"]).name
        checks["open_recording_has_no_directory_entry"] = "(deleted)" in os.readlink(descriptor)
        time.sleep(1.5)  # allow at least one actual independent heartbeat transaction
        with factory() as db:
            job = db.query(GradingJob).filter_by(status="processing").one()
            job_id, old_holder = job.id, job.locked_by
            checks["heartbeat_advanced"] = job.heartbeat_at > job.locked_at
        original.kill()  # SIGKILL on Linux, not a graceful stop or forged stale timestamp
        original.join(timeout=10)
        checks["worker_was_killed"] = original.exitcode == -9
        checks["temporary_recording_disappeared_with_process"] = not descriptor.exists()
        with factory() as db:
            jobs = db.query(GradingJob).options(undefer(GradingJob.audio)).all()
            checks["both_recordings_survived_kill"] = len(jobs) == 2 and all(
                job.audio == audio_fixture() for job in jobs)
            checks["interrupted_and_waiting_jobs_persisted"] = sorted(job.status for job in jobs) == ["processing", "queued"]
            checks["no_premature_result"] = all(sub.overall_score is None for sub in db.query(ExamSubmission))
            last_heartbeat = db.get(GradingJob, job_id).heartbeat_at
        while (datetime.now(timezone.utc).replace(tzinfo=None) - last_heartbeat).total_seconds() <= queue.stale_after_seconds() + .2:
            time.sleep(.1)

        parent2, child2 = context.Pipe()
        connections.extend([parent2, child2])
        replacement = context.Process(target=child_worker, args=(schema, child2, False))
        children.append(replacement)
        replacement.start()
        message = receive(parent2)
        replacement.join(timeout=10)
        checks["replacement_completed_both"] = (replacement.exitcode == 0 and
                                                  message.get("outcomes") == ["completed", "completed"])
        with factory() as db:
            checks["late_old_worker_write_rejected"] = not queue.complete(db, job_id, old_holder, {"overall_score": 1.0})
            jobs = db.query(GradingJob).options(undefer(GradingJob.audio)).all()
            submissions = db.query(ExamSubmission).all()
            checks["exactly_two_results"] = len(jobs) == len(submissions) == 2
            checks["recovered_attempt_count"] = sorted(job.attempts for job in jobs) == [1, 2]
            checks["completed_audio_purged"] = all(job.status == "completed" and job.audio is None for job in jobs)
            checks["results_persisted_and_released"] = all(
                sub.grading_status == "completed" and sub.overall_score == 81.1 and sub.grade_visible == 1
                for sub in submissions)
    finally:
        for child_process in children:
            if child_process.is_alive():
                child_process.kill()
            child_process.join(timeout=10)
        for connection in connections:
            connection.close()
        engine.dispose()
        try:
            if created:
                with admin.begin() as db:
                    db.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
                checks["disposable_schema_removed"] = True
        finally:
            admin.dispose()
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
    return {"kind": "postgres_process_crash_recovery", "inference": "simulated",
            "is_capacity_or_model_accuracy_proof": False, "lease_seconds_for_test": 5,
            "production_default_lease_seconds": 120, "checks": checks,
            "elapsed_seconds": round(time.monotonic() - started, 2), "passed": all(checks.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-staging", action="store_true", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    output = Path(args.report)
    if output.exists():
        parser.error("Use a fresh report filename")
    try:
        report = run()
    except Exception as error:
        report = {"kind": "postgres_process_crash_recovery", "passed": False,
                  "is_capacity_or_model_accuracy_proof": False, "error_type": type(error).__name__}
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(json.dumps(report))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
