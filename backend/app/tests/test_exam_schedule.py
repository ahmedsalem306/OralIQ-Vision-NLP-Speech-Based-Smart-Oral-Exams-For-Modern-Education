"""Admission windows use server UTC and never shorten a sitting already in progress."""
from datetime import datetime, timedelta, timezone

from app.models.question import Question
from app.services import exam_sessions
from app.tests.test_exam_sessions import env, check, submit  # noqa: F401


def schedule(e, token, start, end, headers=None):
    return e["client"].put(f"/api/v1/questions/exams/{token}/schedule", headers=headers or e["lect"],
                           json={"opens_at": start, "closes_at": end})


def test_window_blocks_early_reads_and_starts(env, monkeypatch):
    token, _ = env["exam"]()
    _, student = env["user"]("early@t.com")
    at = datetime.utcnow()
    opening, closing = at + timedelta(hours=1), at + timedelta(hours=2)
    assert schedule(env, token, opening.isoformat() + "Z", closing.isoformat() + "Z").status_code == 200
    monkeypatch.setattr(exam_sessions, "now", lambda: at)
    assert check(env, student, token).json()["detail"]["code"] == "EXAM_NOT_OPEN"
    assert env["client"].get(f"/api/v1/questions/by-group/{token}").status_code == 403


def test_admitted_student_finishes_after_close_but_new_student_cannot(env, monkeypatch):
    token, ids = env["exam"]()
    _, first = env["user"]("first@t.com")
    _, late = env["user"]("late@t.com")
    at = datetime.utcnow()
    assert schedule(env, token, None, (at + timedelta(seconds=30)).isoformat() + "Z").status_code == 200
    monkeypatch.setattr(exam_sessions, "now", lambda: at)
    assert check(env, first, token).status_code == 200
    original_deadline = check(env, first, token).json()["session"]["deadline_at"]
    monkeypatch.setattr(exam_sessions, "now", lambda: at + timedelta(minutes=1))
    assert check(env, late, token).json()["detail"]["code"] == "EXAM_CLOSED"
    # Reload and submission still use the previously admitted sitting's deadline.
    assert check(env, first, token).status_code == 200
    assert check(env, first, token).json()["session"]["deadline_at"] == original_deadline
    with env["Session"]() as db:
        for q in db.query(Question).filter(Question.id.in_(ids)):
            q.closes_at = at - timedelta(seconds=1)
        db.commit()
    assert env["client"].get(f"/api/v1/questions/by-group/{token}", headers=first).status_code == 200
    assert env["client"].get(f"/api/v1/questions/by-group/{token}").status_code == 403
    assert submit(env, first, ids[0], "after-close").status_code == 202


def test_timezone_and_whole_exam_update(env):
    token, ids = env["exam"]()
    result = schedule(env, token, "2027-01-01T10:00:00+02:00", "2027-01-01T11:00:00+02:00")
    assert result.status_code == 200
    assert result.json()["opens_at"] == "2027-01-01T08:00:00Z"
    with env["Session"]() as db:
        assert all(q.opens_at == datetime(2027, 1, 1, 8) for q in db.query(Question).filter(Question.id.in_(ids)))


def test_invalid_and_unauthorized_schedule(env):
    token, _ = env["exam"]()
    _, other = env["user"]("other@t.com", "lecturer", enrolled=False)
    assert schedule(env, token, None, None, other).status_code == 403
    assert schedule(env, token, "2027-01-01T10:00:00", None).status_code == 422
    assert schedule(env, token, "2027-01-01T10:00:00Z", "2027-01-01T09:00:00Z").status_code == 422


def test_new_question_inherits_window(env):
    token, _ = env["exam"](durations=(2,))
    opening = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    assert schedule(env, token, opening, None).status_code == 200
    result = env["client"].post("/api/v1/questions/", headers=env["lect"], json={
        "text": "New question", "model_answer": "Answer", "group_token": token,
    })
    assert result.status_code == 200
    assert datetime.fromisoformat(result.json()["opens_at"]).hour == datetime.fromisoformat(opening).hour
