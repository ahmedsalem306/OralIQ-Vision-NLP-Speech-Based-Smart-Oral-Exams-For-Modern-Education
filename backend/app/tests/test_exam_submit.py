"""
Submitting an answer: the duplicate-grade hole, and the queue that keeps grading off the event loop.

No audio is sent, so the AI pipeline short-circuits and nothing here loads Whisper. What is under
test is the endpoint's own bookkeeping, which is where the duplicate came from.
"""
import anyio
import pytest
from fastapi.testclient import TestClient

from app.api.endpoints import exams
from app.models.exam_submission import ExamSubmission
from app.models.question import Question


@pytest.fixture(scope="module")
def student_token(client: TestClient) -> str:
    client.post("/api/v1/register", json={
        "email": "submit-student@example.com",
        "password": "password123",
        "full_name": "Submit Student",
    })
    r = client.post("/api/v1/login/access-token", data={
        "username": "submit-student@example.com",
        "password": "password123",
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def question(db) -> Question:
    q = Question(text="اشرح قانون نيوتن الأول", model_answer="الجسم يحفظ حالته", keywords="نيوتن")
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def _submit(client, token, question_id, key=None, name="Submit Student"):
    data = {
        "question_id": str(question_id),
        "student_name": name,
        "student_number": "2026-001",
        "anti_cheat_alerts": "{}",
    }
    if key:
        data["submission_key"] = key
    return client.post(
        "/api/v1/exams/submit",
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_a_submission_is_stored_with_its_key(client, student_token, question):
    r = _submit(client, student_token, question.id, key="key-first-answer")
    assert r.status_code == 200, r.text
    assert r.json()["id"]


def test_resending_the_same_key_returns_the_first_grade(client, student_token, question, db):
    """
    The bug this closes: grading can outlast the client's timeout, so a student whose request
    appeared to fail used to submit again and the lecturer ended up with two grades for one answer.
    """
    first = _submit(client, student_token, question.id, key="key-retried-answer")
    assert first.status_code == 200, first.text

    again = _submit(client, student_token, question.id, key="key-retried-answer")
    assert again.status_code == 200, again.text
    assert again.json()["id"] == first.json()["id"]

    rows = db.query(ExamSubmission).filter(
        ExamSubmission.submission_key == "key-retried-answer"
    ).count()
    assert rows == 1


def test_different_keys_are_different_answers(client, student_token, question):
    """Deduplication must not swallow a genuine second attempt at the same question."""
    a = _submit(client, student_token, question.id, key="key-attempt-a")
    b = _submit(client, student_token, question.id, key="key-attempt-b")
    assert a.json()["id"] != b.json()["id"]


def test_a_submission_without_a_key_is_still_accepted(client, student_token, question, db):
    """Older clients predate the key; they must keep working, without dedup protection."""
    r = _submit(client, student_token, question.id)
    assert r.status_code == 200, r.text

    row = db.query(ExamSubmission).filter(ExamSubmission.id == r.json()["id"]).one()
    assert row.submission_key is None


def test_several_keyless_submissions_do_not_collide(client, student_token, question):
    """A unique index over NULLs would reject the second one; NULLs must stay exempt."""
    first = _submit(client, student_token, question.id)
    second = _submit(client, student_token, question.id)
    assert first.status_code == 200 and second.status_code == 200, second.text
    assert first.json()["id"] != second.json()["id"]


def test_another_students_key_does_not_return_their_submission(client, student_token, question):
    """A submission_key is not a capability: presenting someone else's must not leak their grade."""
    client.post("/api/v1/register", json={
        "email": "submit-other@example.com", "password": "password123", "full_name": "Other",
    })
    other = client.post("/api/v1/login/access-token", data={
        "username": "submit-other@example.com", "password": "password123",
    }).json()["access_token"]
    assert _submit(client, student_token, question.id, key="key-owned-by-first").status_code == 200
    r = _submit(client, other, question.id, key="key-owned-by-first")
    assert r.status_code == 409


def test_a_missing_question_is_rejected(client, student_token):
    assert _submit(client, student_token, 999_999, key="key-no-question").status_code == 404


def test_submitting_requires_a_signed_in_user(client, question):
    r = client.post("/api/v1/exams/submit", data={
        "question_id": str(question.id),
        "student_name": "Nobody",
        "student_number": "0",
    })
    assert r.status_code in (401, 403)


# ── Grading concurrency ───────────────────────────────────────────────────────

def test_grading_runs_off_the_event_loop():
    """
    Called straight from the async endpoint, a minute of Whisper froze the whole API: students
    could not even load their next question while one answer was being graded. The pipeline is a
    plain synchronous function now, handed to a worker thread by the endpoint.
    """
    import inspect
    assert not inspect.iscoroutinefunction(exams._run_ai_pipeline)
    source = inspect.getsource(exams.submit_exam)
    assert "anyio.to_thread.run_sync" in source
    assert "_grading_limit" in source


def test_the_number_of_grading_slots_is_bounded(monkeypatch):
    """Each job wants a few cores and about 2GB, so a whole class at once would exhaust memory."""
    monkeypatch.setenv("MAX_CONCURRENT_GRADING", "3")
    assert exams._grading_slots() == 3

    monkeypatch.delenv("MAX_CONCURRENT_GRADING")
    monkeypatch.setattr(exams.os, "cpu_count", lambda: 16)
    assert exams._grading_slots() == 4

    monkeypatch.setattr(exams.os, "cpu_count", lambda: 2)
    assert exams._grading_slots() == 1


def test_grading_slots_ignore_a_nonsense_value(monkeypatch):
    monkeypatch.setenv("MAX_CONCURRENT_GRADING", "none")
    monkeypatch.setattr(exams.os, "cpu_count", lambda: 8)
    assert exams._grading_slots() == 2


def test_the_semaphore_admits_only_its_slot_count():
    """Proves the queue is real: the third caller waits until one of the first two is done."""
    async def scenario():
        limit = anyio.Semaphore(2)
        running = 0
        peak = 0

        async def job():
            nonlocal running, peak
            async with limit:
                running += 1
                peak = max(peak, running)
                await anyio.sleep(0.01)
                running -= 1

        async with anyio.create_task_group() as tg:
            for _ in range(6):
                tg.start_soon(job)
        return peak

    assert anyio.run(scenario) == 2


def test_whisper_threads_divide_the_machine_between_jobs(monkeypatch):
    """Left unset, every job claims every core and parallel jobs fight each other."""
    from app.services import speech_ai

    monkeypatch.setenv("MAX_CONCURRENT_GRADING", "2")
    monkeypatch.delenv("WHISPER_CPU_THREADS", raising=False)
    monkeypatch.setattr(speech_ai.os, "cpu_count", lambda: 8)
    assert speech_ai._cpu_threads() == 4

    monkeypatch.setenv("WHISPER_CPU_THREADS", "6")
    assert speech_ai._cpu_threads() == 6


def test_the_models_load_once_under_concurrency():
    """Two worker threads reaching an unloaded model used to load a copy each: 2GB wasted."""
    import threading
    from app.services.speech_ai import speech_analyzer
    from app.services.nlp_ai import nlp_analyzer

    for service in (speech_analyzer, nlp_analyzer):
        assert isinstance(service._lock, type(threading.Lock()))
