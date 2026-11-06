"""HTTP school-exam load driver. Never interprets a mock run as a capacity measurement."""
import argparse
import asyncio
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import html
import hashlib
import json
import math
from pathlib import Path
import random
import re
import time
from urllib.parse import urlsplit
import uuid

import httpx


@dataclass
class Config:
    base_url: str
    students: int = 500
    questions: int = 2
    question_seconds: float = 180
    ramp_seconds: float = 60
    submit_window_seconds: float = 30
    face_interval_seconds: float = 4  # matches ExamRoom's current face-check interval
    session_interval_seconds: float = 30
    poll_interval_seconds: float = 3
    metrics_interval_seconds: float = 10
    wait_seconds: float = 3600
    max_inflight: int = 500
    request_timeout_seconds: float = 180
    submit_attempts: int = 3
    login_mode: str = "password"
    auth_only: bool = False
    seed: int = 20261107

    def validate(self):
        parsed = urlsplit(self.base_url)
        if (parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username
                or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/")):
            raise ValueError("base_url must be an origin without credentials or a path")
        host = parsed.hostname.lower()
        if host not in ("localhost", "127.0.0.1", "::1"):
            if parsed.scheme != "https" or not any(part in ("staging", "loadtest") for part in host.split(".")):
                raise ValueError("Use localhost or a dedicated https staging/loadtest hostname")
        if not 1 <= self.students <= 5000 or not 1 <= self.questions <= 20:
            raise ValueError("Invalid cohort/question count")
        if self.login_mode not in ("password", "token"):
            raise ValueError("login_mode must be password or token")
        if any(getattr(self, name) <= 0 for name in ("question_seconds", "face_interval_seconds",
               "session_interval_seconds", "poll_interval_seconds", "metrics_interval_seconds", "wait_seconds",
               "max_inflight", "request_timeout_seconds", "submit_attempts")):
            raise ValueError("Durations, concurrency and attempts must be positive")
        if self.ramp_seconds < 0 or self.submit_window_seconds < 0:
            raise ValueError("Ramp/window cannot be negative")


def percentile(values, fraction):
    values = sorted(values)
    return round(values[max(0, math.ceil(len(values) * fraction) - 1)], 4) if values else None


class Runner:
    def __init__(self, config, manifest, audio, images, *, transport=None, on_progress=None):
        config.validate()
        if manifest.get("allowed_origin", "").rstrip("/") != config.base_url.rstrip("/"):
            raise ValueError("Target differs from fixture's allowed_origin")
        if len(manifest.get("students", [])) < config.students or len(manifest["exam"]["question_ids"]) != config.questions:
            raise ValueError("Fixture cohort/questions do not match the scenario")
        if not config.auth_only and (len(audio) != config.questions or not images or any(not b or len(b) > 40 * 1024**2 for b in audio)):
            raise ValueError("Provide one valid audio input per question and at least one face frame")
        if any(not b or len(b) > 8 * 1024**2 for b in images):
            raise ValueError("Face frame exceeds upload limit")
        if transport is None and not config.auth_only and manifest.get("biometric_mode") != "real":
            raise ValueError("Real runs require genuinely enrolled staging identity fixtures")
        if transport is None and not config.auth_only and manifest["exam"].get("question_seconds") != config.question_seconds:
            raise ValueError("Recording time must match the prepared exam")
        self.config, self.manifest, self.audio, self.images = config, manifest, audio, images
        self.transport = transport
        self.on_progress = on_progress
        self.mock = transport is not None
        self.latencies, self.statuses = defaultdict(list), defaultdict(Counter)
        self.codes = Counter()
        self.accepted, self.outcomes, self.snapshots = [], {}, []
        self.started_students, self.failed_students = 0, 0
        self.authenticated_students = 0
        self.first_submit_rejections, self.face_mismatches, self.face_checks = 0, 0, 0
        self.transport_errors, self.duplicate_ids = 0, 0
        self.slots = asyncio.Semaphore(config.max_inflight)

    async def request(self, operation, method, path, **kwargs):
        # Includes client-side waiting for a connection/slot, not just server response time.
        started = time.perf_counter()
        try:
            async with self.slots:
                response = await self.client.request(method, path, **kwargs)
            self.statuses[operation][str(response.status_code)] += 1
            if response.status_code >= 400:
                try:
                    detail = response.json().get("detail", {})
                    code = detail.get("code", "") if isinstance(detail, dict) else ""
                    if re.fullmatch(r"[A-Z0-9_]{1,64}", code):
                        self.codes[code] += 1
                except (ValueError, AttributeError):
                    pass
            return response
        except httpx.TransportError:
            self.statuses[operation]["transport_error"] += 1
            self.transport_errors += 1
            return None
        finally:
            self.latencies[operation].append(time.perf_counter() - started)

    @staticmethod
    def body(response):
        try:
            body = response.json() if response is not None else {}
            return body if isinstance(body, dict) else {}
        except ValueError:
            return {}

    async def preflight(self):
        owner = self.manifest["lecturer"]
        response = await self.request("preflight", "GET", "/api/v1/users/me",
                                      headers={"Authorization": f"Bearer {owner['token']}"})
        body = self.body(response)
        if (body.get("email") != owner["email"] or body.get("id") != owner["id"]
                or not owner["email"].endswith("@loadtest.invalid")):
            raise ValueError("Staging identity check failed; refusing to start cohort")
        pilot = self.manifest["students"][0]
        headers = {"Authorization": f"Bearer {pilot['token']}"}
        identity = await self.request("preflight", "GET", "/api/v1/users/me", headers=headers)
        if self.body(identity).get("email") != pilot["email"]:
            raise ValueError("Pilot identity mismatch; refusing to start cohort")
        if self.config.auth_only:
            return
        metrics = await self.request("preflight", "GET", "/api/v1/exams/grading/metrics",
            headers={"Authorization": f"Bearer {self.manifest['metrics_admin']['token']}"})
        if metrics is None or metrics.status_code != 200:
            raise ValueError("Cannot read staging queue metrics")
        if self.body(metrics).get("queued", 0) or self.body(metrics).get("processing", 0):
            raise ValueError("Queue is not idle; finish the earlier staging run first")
        check = await self.request("preflight_face", "POST", "/api/v1/face/verify", headers=headers,
                                   files={"image": ("frame.jpg", self.images[0], "image/jpeg")})
        if check is None or check.status_code != 200 or self.body(check).get("is_match") is not True:
            raise ValueError("Pilot face does not match the enrolled test identity")

    async def monitor(self, stop):
        headers = {"Authorization": f"Bearer {self.manifest['metrics_admin']['token']}"}
        while not stop.is_set():
            response = await self.request("queue_metrics", "GET", "/api/v1/exams/grading/metrics", headers=headers)
            body = self.body(response)
            if response is not None and response.status_code == 200:
                self.snapshots.append({"elapsed_seconds": round(time.monotonic() - self.started_at, 2),
                    **{key: body.get(key) for key in ("queued", "processing", "completed", "failed",
                                                     "oldest_queued_seconds", "process_ms", "queue_wait_ms")}})
            if self.on_progress:
                self.on_progress({"phase": "running", "elapsed_seconds": round(time.monotonic() - self.started_at, 1),
                    "started_students": self.started_students, "accepted_answers": len(self.accepted),
                    "observed_graded": len(self.outcomes), "queue": self.snapshots[-1] if self.snapshots else None})
            try:
                await asyncio.wait_for(stop.wait(), timeout=self.config.metrics_interval_seconds)
            except asyncio.TimeoutError:
                pass

    async def record_question(self, headers, rng):
        end = time.monotonic() + self.config.question_seconds
        next_face = next_session = time.monotonic()
        while time.monotonic() < end:
            now = time.monotonic()
            if now >= next_face:
                response = await self.request("face_verify", "POST", "/api/v1/face/verify", headers=headers,
                    data={"exam_token": self.manifest["exam"]["key"]},
                    files={"image": ("frame.jpg", rng.choice(self.images), "image/jpeg")})
                if response is not None and response.status_code == 200:
                    self.face_checks += 1
                    if self.body(response).get("is_match") is not True:
                        self.face_mismatches += 1
                next_face = time.monotonic() + self.config.face_interval_seconds * rng.uniform(.9, 1.1)
            if now >= next_session:
                await self.request("session_resume", "GET", f"/api/v1/exams/access-check/{self.manifest['exam']['key']}", headers=headers)
                next_session = time.monotonic() + self.config.session_interval_seconds
            await asyncio.sleep(max(0, min(end - time.monotonic(), next_face - time.monotonic(),
                                          next_session - time.monotonic())))

    async def submit(self, headers, index, question_index):
        key = str(uuid.uuid4())  # identical across retries, including ambiguous network failures
        data = {"question_id": str(self.manifest["exam"]["question_ids"][question_index]),
                "student_name": f"Load student {index}", "student_number": str(index), "submission_key": key}
        for attempt in range(self.config.submit_attempts):
            response = await self.request("submit", "POST", "/api/v1/exams/submit", headers=headers, data=data,
                files={"audio": ("answer.webm", self.audio[question_index], "audio/webm")})
            status = response.status_code if response is not None else 0
            body = self.body(response)
            if status in (200, 202) and isinstance(body.get("id"), int):
                return {"id": body["id"], "headers": headers, "accepted_at": time.monotonic()}
            if attempt == 0:
                self.first_submit_rejections += 1
            if not status:  # a timed-out request might already be durably accepted
                lookup = await self.request("submission_recovery", "GET",
                    f"/api/v1/exams/submissions/by-key/{key}/grading", headers=headers)
                recovered = self.body(lookup)
                if lookup is not None and lookup.status_code == 200 and isinstance(recovered.get("id"), int):
                    return {"id": recovered["id"], "headers": headers, "accepted_at": time.monotonic()}
            if status and status not in (429, 500, 502, 503, 504):
                break
            if attempt + 1 < self.config.submit_attempts:
                try:
                    delay = min(60, max(1, float(response.headers.get("Retry-After", 2)))) if response is not None else 2
                except ValueError:
                    delay = 2
                await asyncio.sleep(delay)
        return None

    async def student(self, index, account):
        rng = random.Random(self.config.seed + index)
        await asyncio.sleep(rng.uniform(0, self.config.ramp_seconds))
        token = account["token"]
        if self.config.login_mode == "password":
            response = await self.request("login", "POST", "/api/v1/login/access-token",
                                          data={"username": account["email"], "password": account["password"]})
            token = self.body(response).get("access_token")
            if not token:
                self.failed_students += 1
                return
        headers = {"Authorization": f"Bearer {token}"}
        response = await self.request("student_identity", "GET", "/api/v1/users/me", headers=headers)
        if self.body(response).get("email") != account["email"]:
            self.failed_students += 1
            return
        self.authenticated_students += 1
        if self.config.auth_only:
            return
        response = await self.request("questions", "GET", f"/api/v1/questions/by-group/{self.manifest['exam']['key']}", headers=headers)
        if response is None or response.status_code != 200:
            self.failed_students += 1
            return
        response = await self.request("session_start", "GET", f"/api/v1/exams/access-check/{self.manifest['exam']['key']}", headers=headers)
        if response is None or response.status_code != 200:
            self.failed_students += 1
            return
        self.started_students += 1
        for question_index in range(self.config.questions):
            await self.record_question(headers, rng)
            await asyncio.sleep(rng.uniform(0, self.config.submit_window_seconds))
            accepted = await self.submit(headers, index, question_index)
            if accepted is None:
                self.failed_students += 1
                return  # the browser cannot advance after a failed answer
            self.accepted.append({**accepted, "student_index": index})

    async def follow_grades(self, pending, deadline):
        pending = list(pending)
        while pending and time.monotonic() < deadline:
            accepted = pending.pop(0)
            response = await self.request("grading_poll", "GET",
                f"/api/v1/exams/submissions/{accepted['id']}/grading", headers=accepted["headers"])
            body = self.body(response)
            status = body.get("grading_status")
            if response is not None and response.status_code == 200 and status in ("completed", "failed"):
                self.outcomes[accepted["id"]] = {"status": status,
                    "observed_seconds_after_accept": round(time.monotonic() - accepted["accepted_at"], 3)}
            else:
                pending.append(accepted)
            await asyncio.sleep(min(self.config.poll_interval_seconds, max(0, deadline - time.monotonic())))

    async def run(self):
        self.started_at = time.monotonic()
        stop = asyncio.Event()
        limits = httpx.Limits(max_connections=self.config.max_inflight, max_keepalive_connections=self.config.max_inflight)
        async with httpx.AsyncClient(base_url=self.config.base_url.rstrip("/"), transport=self.transport,
                                     limits=limits, timeout=self.config.request_timeout_seconds, follow_redirects=False) as self.client:
            await self.preflight()
            preflight_seconds = time.monotonic() - self.started_at
            self.started_at = time.monotonic()
            monitoring = asyncio.create_task(self.monitor(stop)) if not self.config.auth_only else None
            try:
                await asyncio.gather(*(self.student(i, account) for i, account in
                                       enumerate(self.manifest["students"][:self.config.students])))
                self.submission_phase_seconds = time.monotonic() - self.started_at
                unique = {item["id"]: item for item in self.accepted}
                self.duplicate_ids = len(self.accepted) - len(unique)
                # One polling stream per student, rotating answers, rather than doubling the
                # browser's request rate when an exam has multiple questions.
                deadline = time.monotonic() + self.config.wait_seconds
                per_student = defaultdict(list)
                for item in unique.values():
                    per_student[item["student_index"]].append(item)
                await asyncio.gather(*(self.follow_grades(items, deadline) for items in per_student.values()))
            finally:
                stop.set()
                if monitoring:
                    await monitoring
        expected = 0 if self.config.auth_only else self.config.students * self.config.questions
        completed = sum(item["status"] == "completed" for item in self.outcomes.values())
        failed = sum(item["status"] == "failed" for item in self.outcomes.values())
        unique_count = len({item["id"] for item in self.accepted})
        requests = {op: {"count": len(values), "status_counts": dict(self.statuses[op]),
                    "p50_seconds": percentile(values, .5), "p95_seconds": percentile(values, .95),
                    "max_seconds": round(max(values), 4)} for op, values in self.latencies.items()}
        http_errors = sum(count for operation in self.statuses.values() for status, count in operation.items()
                          if status == "transport_error" or int(status) >= 400)
        all_graded = None if self.config.auth_only else unique_count == expected and completed == expected and not self.duplicate_ids
        success = self.authenticated_students == self.config.students if self.config.auth_only else all_graded
        return {"generated_at": datetime.now(timezone.utc).isoformat(),
            "measurement": "control_flow_only_mock" if self.mock else "staging_http_load",
            "is_server_capacity_proof": False, "scenario": asdict(self.config),
            "preflight_seconds": round(preflight_seconds, 3),
            "fixture_database_kind": self.manifest.get("database_kind"),
            "audio_bytes_per_question": [len(value) for value in self.audio],
            "audio_sha256_per_question": [hashlib.sha256(value).hexdigest() for value in self.audio],
            "offered_audio_bytes": self.config.students * sum(len(value) for value in self.audio),
            "configured_audio_minutes": self.config.students * self.config.questions * self.config.question_seconds / 60,
            "expected_answers": expected, "started_students": self.started_students,
            "authenticated_students": self.authenticated_students,
            "students_not_finishing": self.failed_students, "accepted_answers": len(self.accepted),
            "unique_accepted_answers": unique_count, "duplicate_submission_ids": self.duplicate_ids,
            "completed": completed, "failed_grading": failed, "pending": unique_count - completed - failed,
            "first_submit_rejections": self.first_submit_rejections, "transport_errors": self.transport_errors,
            "successful_face_checks": self.face_checks, "face_mismatches": self.face_mismatches,
            "submission_phase_seconds": round(self.submission_phase_seconds, 3),
            "total_seconds": round(time.monotonic() - self.started_at, 3),
            "server_error_codes": dict(self.codes), "requests": requests, "queue_snapshots": self.snapshots,
            "http_error_count": http_errors,
            "all_answers_received_and_graded": all_graded,
            "run_passed_transport_checks": success and not http_errors and not self.face_mismatches,
            "limitations": ["HTTP clients, not 500 real browsers/cameras", "Static consenting test identity frames",
                "After recording, one grade poll per student/interval, rotating accepted answers",
                "No grading-latency SLA assumed; polling observations are upper bounds",
                "A mock run does not exercise the database, network, models, server CPU or RAM"]}


def write_report(report, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    rows = "".join(f"<tr><td>{html.escape(name)}</td><td>{data['count']}</td><td>{data['p95_seconds']}</td>"
                   f"<td>{html.escape(str(data['status_counts']))}</td></tr>" for name, data in report["requests"].items())
    title = "تجربة الأداة بعميل وهمي — ليست قياسًا للسيرفر" if report["measurement"] == "control_flow_only_mock" else "نتيجة اختبار HTTP على بيئة تجريبية"
    path.with_suffix(".html").write_text(f'''<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<title>OralIQ — اختبار المدرسة</title><style>body{{font-family:system-ui;max-width:1000px;margin:40px auto;padding:20px;background:#f8f5ef;color:#201d18}}table{{width:100%;border-collapse:collapse}}td,th{{padding:12px;border-bottom:1px solid #ccc;text-align:start}}.notice{{padding:20px;background:#fff0c4;border-radius:12px}}h1{{font-size:28px}}</style>
<h1>{title}</h1><p class="notice">هذه النتيجة لا تثبت وحدها تحمل ٥٠٠ طالب. لا توجد نتيجة لتجربة السيرفر الحقيقي قبل تشغيل الاختبار عليه.</p>
<p>الإجابات المتوقعة: {report['expected_answers']} · المحفوظة: {report['accepted_answers']} · المصححة: {report['completed']} · الفاشلة: {report['failed_grading']} · المنتظرة: {report['pending']}</p>
<p>الدخول: {html.escape(report['scenario']['login_mode'])} · طلاب بدأوا الامتحان: {report['started_students']} · رفض أول محاولة تسليم: {report['first_submit_rejections']}</p>
<p>اختبار دخول فقط: {report['scenario']['auth_only']} · حسابات اجتازت التحقق: {report['authenticated_students']}</p>
<table><thead><tr><th>العملية</th><th>عدد الطلبات</th><th>p95 بالثواني</th><th>حالات HTTP</th></tr></thead><tbody>{rows}</tbody></table>
<p>التوقيتات في التجربة الوهمية تخص الأداة فقط. في التجربة الحقيقية تشمل الانتظار عند العميل والشبكة والسيرفر.</p></html>''', encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--accounts", required=True)
    parser.add_argument("--audio", nargs="+", default=[])
    parser.add_argument("--face-images", nargs="+", default=[])
    parser.add_argument("--auth-only", action="store_true")
    parser.add_argument("--login-mode", choices=("password", "token"))
    parser.add_argument("--report", required=True)
    parser.add_argument("--confirm-staging", action="store_true", required=True)
    args = parser.parse_args()
    config = Config(**json.loads(Path(args.config).read_text(encoding="utf-8")))
    config.auth_only = args.auth_only or config.auth_only
    if args.login_mode:
        config.login_mode = args.login_mode
    config.validate()
    manifest = json.loads(Path(args.accounts).read_text(encoding="utf-8"))
    durations = []
    if not config.auth_only and (len(args.audio) != config.questions or not args.face_images):
        parser.error("Supply one --audio per question and --face-images")
    for path in ([] if config.auth_only else args.audio):
        from app.core.media_limits import decode_audio_bounded
        duration = len(decode_audio_bounded(path, max_seconds=math.ceil(config.question_seconds * 1.1))) / 16000
        durations.append(round(duration, 3))
        if abs(duration - config.question_seconds) > max(5, config.question_seconds * .05):
            parser.error("Audio inputs must have the scenario's real duration (within 5% or 5 seconds)")
    progress_path = Path(args.report).with_suffix(".progress.json")
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    def progress(snapshot):
        progress_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(snapshot, ensure_ascii=False), flush=True)
    progress({"phase": "starting"})
    report = asyncio.run(Runner(config, manifest, [Path(p).read_bytes() for p in args.audio],
                                [Path(p).read_bytes() for p in args.face_images], on_progress=progress).run())
    report["measured_audio_seconds_per_question"] = durations
    write_report(report, args.report)
    print(json.dumps({key: report[key] for key in ("measurement", "expected_answers", "accepted_answers",
                     "completed", "failed_grading", "pending", "all_answers_received_and_graded")}))
    return 0 if report["run_passed_transport_checks"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
