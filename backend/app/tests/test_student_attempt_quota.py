"""Real SQL/HTTP tests of financial admission; no model loading or paid calls."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from app.models.exam_session import ExamSession
from app.models.exam_sitting import ExamSitting
from app.models.question import Question
from app.models.user import User
from app.services import billing_service as billing
from app.tests.test_exam_sessions import env, check, code, submit  # noqa: F401


def owner_id(e, qid):
    with e["Session"]() as db:
        return db.get(Question, qid).creator_id


def test_resume_and_two_answers_use_one_credit(env):
    token, questions = env["exam"]()
    uid, headers = env["user"]("one-credit@t.com")
    first = check(env, headers, token)
    assert first.status_code == 200
    assert check(env, headers, token).json()["session"]["id"] == first.json()["session"]["id"]
    for qid in questions:
        assert submit(env, headers, qid, f"credit-{qid}").status_code == 202
    with env["Session"]() as db:
        assert db.get(User, owner_id(env, questions[0])).lifetime_attempts_started == 1
        assert db.query(ExamSitting).filter_by(user_id=uid).count() == 1


def test_last_credit_allows_completion_but_blocks_new_start(env):
    token, questions = env["exam"]()
    oid = owner_id(env, questions[0])
    with env["Session"]() as db:
        db.get(User, oid).lifetime_attempts_started = 4
        db.commit()
    _, h = env["user"]("last-credit@t.com")
    assert check(env, h, token).status_code == 200
    _, other = env["user"]("over-credit@t.com")
    rejected = check(env, other, token)
    assert rejected.status_code == 402 and code(rejected) == "STUDENT_ATTEMPT_QUOTA_EXCEEDED"
    assert check(env, h, token).status_code == 200
    for qid in questions:
        assert submit(env, h, qid, f"last-{qid}").status_code == 202


def test_concurrent_last_credit_cannot_be_overspent(env):
    token, questions = env["exam"]()
    oid = owner_id(env, questions[0])
    with env["Session"]() as db:
        db.get(User, oid).lifetime_attempts_started = 4
        db.commit()
    users = [env["user"](f"race-{i}@t.com")[1] for i in range(2)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda h: check(env, h, token), users))
    assert sorted(r.status_code for r in results) == [200, 402]
    with env["Session"]() as db:
        assert db.get(User, oid).lifetime_attempts_started == 5
        assert db.query(ExamSitting).count() == 1


def test_concurrent_reload_reserves_one_credit(env):
    token, questions = env["exam"]()
    _, h = env["user"]("same-start@t.com")
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: check(env, h, token), range(2)))
    assert all(r.status_code == 200 for r in results)
    assert len({r.json()["session"]["id"] for r in results}) == 1
    with env["Session"]() as db:
        assert db.get(User, owner_id(env, questions[0])).lifetime_attempts_started == 1


def test_retake_uses_another_credit(env):
    token, questions = env["exam"](max_attempts=2)
    _, h = env["user"]("retake@t.com")
    assert check(env, h, token).status_code == 200
    for qid in questions:
        assert submit(env, h, qid, f"take1-{qid}").status_code == 202
    assert check(env, h, token).status_code == 200
    with env["Session"]() as db:
        assert db.get(User, owner_id(env, questions[0])).lifetime_attempts_started == 2


def test_monthly_reset_keeps_lifetime_usage_and_downgrade_cannot_reset_trial(env):
    _, questions = env["exam"]()
    oid = owner_id(env, questions[0])
    with env["Session"]() as db:
        account = db.get(User, oid)
        billing.grant_plan(account, "pro", "yearly")
        account.cycle_started_at = billing.utcnow() - timedelta(days=31)
        account.cycle_attempts_started = 50
        account.lifetime_attempts_started = 60
        db.commit()
        billing.refresh_account_state(db, account)
        assert billing.attempts_used(account) == 0
        assert account.lifetime_attempts_started == 60
        billing.end_subscription(account)
        db.commit()
        assert billing.attempts_used(account) == 60
        assert billing.attempt_limit(account) == 5


def test_assistant_uses_owner_attempt_allowance(env):
    token, questions = env["exam"]()
    oid = owner_id(env, questions[0])
    assistant, _ = env["user"]("quota-assistant@t.com", "lecturer", enrolled=False)
    with env["Session"]() as db:
        billing.grant_plan(db.get(User, oid), "campus", "monthly")
        db.get(User, assistant).owner_id = oid
        for qid in questions:
            db.get(Question, qid).creator_id = assistant
        db.commit()
    _, h = env["user"]("team-student@t.com")
    assert check(env, h, token).status_code == 200
    with env["Session"]() as db:
        assert db.get(User, oid).cycle_attempts_started == 1
        assert db.get(User, assistant).cycle_attempts_started == 0


def test_launch_ceiling_is_shared_across_lecturers_and_resume_still_works(env, monkeypatch):
    monkeypatch.setenv("LAUNCH_MAX_ACTIVE_EXAMS", "2")
    token, questions = env["exam"]()
    owner2, _ = env["user"]("other-owner@t.com", "lecturer", enrolled=False)
    with env["Session"]() as db:
        question = Question(creator_id=owner2, text="Q", model_answer="A", duration_minutes=3)
        db.add(question)
        db.commit()
        token2 = question.exam_token
    _, h1 = env["user"]("seat1@t.com")
    _, h2 = env["user"]("seat2@t.com")
    _, h3 = env["user"]("seat3@t.com")
    assert check(env, h1, token).status_code == 200
    assert check(env, h2, token2).status_code == 200
    blocked = check(env, h3, token2)
    assert blocked.status_code == 503 and code(blocked) == "LAUNCH_CAPACITY_REACHED"
    assert blocked.headers["retry-after"] == "30"
    assert check(env, h1, token).status_code == 200
    with env["Session"]() as db:
        assert db.get(User, owner2).lifetime_attempts_started == 1
        db.query(ExamSession).filter_by(account_id=owner2).update({"finished": True})
        db.commit()
    assert check(env, h3, token2).status_code == 200


def test_legacy_long_exam_is_blocked_before_spending_credit(env):
    token, questions = env["exam"](durations=(4,))
    _, h = env["user"]("oversized@t.com")
    rejected = check(env, h, token)
    assert rejected.status_code == 402 and code(rejected) == "EXAM_PLAN_LIMIT_CHANGED"
    with env["Session"]() as db:
        assert db.get(User, owner_id(env, questions[0])).lifetime_attempts_started == 0
        assert db.query(ExamSession).count() == 0


def test_audio_compute_bound_matches_launch_answer_limit():
    from app.services.speech_ai import SpeechAnalyzer
    assert SpeechAnalyzer.MAX_AI_AUDIO_SECONDS == 180


def test_expired_paid_grace_cannot_start_new_sittings_but_existing_can_finish(env):
    token, questions = env["exam"]()
    oid = owner_id(env, questions[0])
    with env["Session"]() as db:
        billing.grant_plan(db.get(User, oid), "pro", "monthly")
        db.commit()
    _, h = env["user"]("already-started@t.com")
    assert check(env, h, token).status_code == 200
    with env["Session"]() as db:
        db.get(User, oid).plan_expires_at = billing.utcnow() - timedelta(hours=1)
        db.commit()
    _, newcomer = env["user"]("expired-new@t.com")
    rejected = check(env, newcomer, token)
    assert rejected.status_code == 402 and code(rejected) == "SUBSCRIPTION_EXPIRED"
    with env["Session"]() as db:
        assert db.query(ExamSession).count() == 1
    for qid in questions:
        assert submit(env, h, qid, f"expiry-{qid}").status_code == 202
