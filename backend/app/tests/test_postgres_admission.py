"""Real PostgreSQL concurrency in CI; no existing application schema is touched."""
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.models.question import Question
from app.models.exam_submission import ExamSubmission
from app.models.grading_job import GradingJob
from app.services import grading_queue as gq


@pytest.mark.skipif(not os.environ.get("TEST_POSTGRES_URL"), reason="Requires isolated PostgreSQL test service")
def test_postgres_serializes_global_queue_admission(monkeypatch):
    schema = "oraliq_security_" + uuid.uuid4().hex
    admin = create_engine(os.environ["TEST_POSTGRES_URL"])
    engine = None
    try:
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(os.environ["TEST_POSTGRES_URL"], connect_args={"options": f"-csearch_path={schema}"})
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine, autoflush=False)
        with Session() as db:
            user = User(email="pg-test@example.com", role="student", hashed_password="x")
            question = Question(text="Question", model_answer="Answer")
            db.add_all([user, question])
            db.commit()
            user_id, question_id = user.id, question.id
        monkeypatch.setenv("GRADING_MAX_PENDING_JOBS", "1")
        barrier = threading.Barrier(2)

        def enqueue(index):
            with Session() as db:
                submission = ExamSubmission(student_id=user_id, question_id=question_id,
                                            student_name="Test", student_number=str(index))
                db.add(submission)
                barrier.wait(timeout=10)
                try:
                    gq.enqueue(db, submission, audio=b"recording", audio_suffix=".wav", anti_cheat_alerts="{}",
                               voice_embedding=None, has_faceprint=False, priority=3)
                    db.commit()
                    return 202
                except HTTPException as error:
                    db.rollback()
                    return error.status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(enqueue, range(2)))
        assert sorted(results) == [202, 503]
        with Session() as db:
            assert db.query(GradingJob).count() == db.query(ExamSubmission).count() == 1
    finally:
        if engine is not None:
            engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin.dispose()
