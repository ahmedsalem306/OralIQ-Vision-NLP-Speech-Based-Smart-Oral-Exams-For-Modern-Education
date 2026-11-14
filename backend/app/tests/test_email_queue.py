"""Queue behavior with isolated SQLite and in-memory mail only; no provider traffic."""
import hashlib
import json
import re
import smtplib
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models
from app.api import deps
from app.api.api_router import api_router
from app.core.database import Base
from app.core.security import create_access_token
from app.models.user import User
from app.models.email_verification import EmailVerificationToken
from app.models.email_outbox import EmailOutbox, EmailDeliveryState
from app.services import email_delivery as q, email_verification as ev, mailer


@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("EMAIL_DELIVERY_MODE", "queued")
    monkeypatch.setenv("EMAIL_BACKEND", "memory")
    monkeypatch.setenv("FRONTEND_URL", "https://app.oraliq.example")
    monkeypatch.setenv("EMAIL_DAILY_SEND_LIMIT", "90")
    monkeypatch.setenv("EMAIL_MONTHLY_SEND_LIMIT", "2700")
    monkeypatch.setenv("EMAIL_QUEUE_MAX_PENDING", "1000")
    monkeypatch.setenv("EMAIL_MAX_ATTEMPTS", "8")
    engine = create_engine(f"sqlite:///{(tmp_path / 'mail.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    def database():
        with Session() as db:
            yield db
    app.dependency_overrides[deps.get_db] = database
    mailer.outbox.clear()
    yield TestClient(app), Session
    engine.dispose()


def seed(Session, *, role="student", verified=False, raw=None, now=None):
    now = now or q.utcnow()
    raw = raw or "secret-" + __import__('uuid').uuid4().hex
    with Session() as db:
        user = User(email=f"test-{__import__('uuid').uuid4().hex}@example.com", role=role,
                    hashed_password="old-hash", email_verified=verified, requires_email_verification=True)
        db.add(user); db.flush()
        token = EmailVerificationToken(user_id=user.id, sent_to=user.email, token_hash=ev.hash_token(raw),
                                       created_at=now, expires_at=now + timedelta(hours=24), pending_password_hash="chosen-hash")
        db.add(token); db.flush()
        assert q.enqueue(db, token, "verification", user.email, "Confirm", f"https://app.oraliq.example/verify-email#token={raw}")
        db.commit()
        return user.id, token.id


def test_signup_queues_encrypted_mail_then_verifies_without_sending_from_request(env):
    client, Session = env
    result = client.post("/api/v1/register", json={"email":"queue-owner@example.com", "password":"Owner-password-123", "role":"student"})
    assert result.status_code == 202
    assert not mailer.outbox
    with Session() as db:
        job = db.query(EmailOutbox).one()
        ciphertext = job.encrypted_payload
        assert "queue-owner@example.com" not in ciphertext and "verify-email" not in ciphertext
        assert job.status == "queued"
    assert q.process_one(Session)
    assert len(mailer.outbox) == 1
    message = mailer.outbox[0]
    raw = re.search(r"#token=([A-Za-z0-9_-]+)", message.get_content()).group(1)
    assert raw not in ciphertext
    with Session() as db:
        job = db.query(EmailOutbox).one()
        assert job.status == "sent" and job.encrypted_payload is None
        assert db.query(EmailVerificationToken).one().token_hash == hashlib.sha256(raw.encode()).hexdigest()
    verified = client.post("/api/v1/auth/verify-email", json={"token":raw,"password":"Owner-password-123"})
    assert verified.status_code == 200


def test_retry_keeps_message_and_provider_idempotency_key_stable(env, monkeypatch, capsys):
    _, Session = env
    seed(Session)
    sent = []
    original = mailer.send
    def unreliable(*args, **kwargs):
        sent.append((args, kwargs))
        if len(sent) == 1:
            raise mailer.MailError("secret-provider-reply re_sensitive", "TRANSPORT_FAILED")
        return original(*args, **kwargs)
    monkeypatch.setattr(mailer, "send", unreliable)
    now = q.utcnow()
    assert q.process_one(Session, now)
    assert not q.process_one(Session, now + timedelta(seconds=10))
    assert q.process_one(Session, now + timedelta(seconds=31))
    assert sent[0] == sent[1]
    assert "re_sensitive" not in capsys.readouterr().out
    assert len(mailer.outbox) == 1


def test_daily_budget_waits_for_utc_reset_and_survives_new_session(env, monkeypatch):
    _, Session = env
    now = datetime(2026, 11, 14, 23, 59)
    monkeypatch.setattr(q, "utcnow", lambda: now)
    monkeypatch.setenv("EMAIL_DAILY_SEND_LIMIT", "1")
    seed(Session, now=now); seed(Session, now=now)
    assert q.process_one(Session, now)
    assert not q.process_one(Session, now + timedelta(seconds=2))
    with Session() as db:
        status = q.metrics(db, now)
        assert "DAILY_BUDGET" in status["issues"]
        assert status["pending"] == 1 and status["pause_until"] == "2026-11-15T00:00:00Z"
    assert q.process_one(Session, now + timedelta(minutes=2))
    assert len(mailer.outbox) == 2


def test_monthly_budget_does_not_send_until_next_month(env, monkeypatch):
    _, Session = env
    now = datetime(2026, 11, 30, 23, 59)
    monkeypatch.setattr(q, "utcnow", lambda: now)
    monkeypatch.setenv("EMAIL_DAILY_SEND_LIMIT", "0")
    monkeypatch.setenv("EMAIL_MONTHLY_SEND_LIMIT", "1")
    seed(Session, now=now); seed(Session, now=now)
    assert q.process_one(Session, now)
    assert not q.process_one(Session, now + timedelta(seconds=2))
    assert q.process_one(Session, now + timedelta(minutes=2))


def test_full_queue_rejects_signup_uniformly_before_account_lookup(env, monkeypatch):
    client, Session = env
    user_id, _ = seed(Session)
    monkeypatch.setenv("EMAIL_QUEUE_MAX_PENDING", "1")
    with Session() as db: existing = db.get(User,user_id).email
    results = [client.post("/api/v1/register", json={"email":email,"password":"Password-123"}) for email in [existing,"unknown@example.com"]]
    assert [r.status_code for r in results] == [503,503]
    assert results[0].json() == results[1].json()
    with Session() as db:
        assert db.query(User).count() == db.query(EmailVerificationToken).count() == db.query(EmailOutbox).count() == 1


@pytest.mark.parametrize("change", ["expired", "verified", "email_changed", "used", "tampered"])
def test_obsolete_or_tampered_mail_is_never_sent_and_payload_is_erased(env, change):
    _, Session = env
    user_id, token_id = seed(Session)
    with Session() as db:
        job, user, token = db.query(EmailOutbox).one(), db.get(User,user_id), db.get(EmailVerificationToken,token_id)
        if change == "expired": job.expires_at = q.utcnow() - timedelta(seconds=1)
        elif change == "verified": user.email_verified = True
        elif change == "email_changed": user.email = "another@example.com"
        elif change == "used": token.used_at = q.utcnow()
        else: job.encrypted_payload = "invalid ciphertext"
        db.commit()
    assert not q.process_one(Session)
    assert not mailer.outbox
    with Session() as db:
        job = db.query(EmailOutbox).one()
        assert job.status in ("expired","failed","cancelled") and job.encrypted_payload is None


def test_expiry_is_enforced_even_if_smtp_is_unconfigured(env, monkeypatch):
    _, Session = env
    seed(Session,now=q.utcnow()-timedelta(days=2))
    monkeypatch.setattr(mailer,"configured",lambda:False)
    assert not q.process_one(Session)
    with Session() as db: assert db.query(EmailOutbox).one().encrypted_payload is None


def test_crashed_sender_lease_recovers_and_stale_sender_cannot_finish(env):
    _, Session = env
    seed(Session)
    now = q.utcnow()
    with Session() as db: first = q.claim(db,now)
    with Session() as db: assert q.claim(db,now+timedelta(seconds=1)) is None
    with Session() as db: second = q.claim(db,now+timedelta(seconds=181))
    assert first.id == second.id and first.delivery_key == second.delivery_key and first.nonce != second.nonce
    with Session() as db: assert not q.finish(db,first,now=now+timedelta(seconds=182))
    with Session() as db: assert q.finish(db,second,now=now+timedelta(seconds=182))


def test_retry_budget_is_finite_and_clears_encrypted_payload(env, monkeypatch):
    _, Session = env
    monkeypatch.setenv("EMAIL_MAX_ATTEMPTS","2")
    seed(Session)
    monkeypatch.setattr(mailer,"send",lambda *a,**k: (_ for _ in ()).throw(mailer.MailError("offline")))
    now = q.utcnow()
    assert q.process_one(Session,now)
    assert q.process_one(Session,now+timedelta(seconds=31))
    with Session() as db:
        job=db.query(EmailOutbox).one()
        assert job.attempts==2 and job.status=="failed" and job.encrypted_payload is None


def test_bad_credentials_pause_all_sends_without_logging_provider_reply(env, monkeypatch):
    _, Session = env
    seed(Session); seed(Session)
    now = q.utcnow()
    with monkeypatch.context() as patch:
        patch.setattr(mailer,"send",lambda *a,**k: (_ for _ in ()).throw(mailer.MailError("re_private", "AUTH_FAILED")))
        assert q.process_one(Session,now)
    assert not q.process_one(Session,now+timedelta(seconds=60))
    with Session() as db: assert "AUTH_FAILED" in q.metrics(db,now+timedelta(seconds=301))["issues"]
    assert q.process_one(Session,now+timedelta(seconds=301))
    assert len(mailer.outbox)==1


def test_metadata_retention_drops_only_old_terminal_jobs(env):
    _, Session = env
    seed(Session)
    now = q.utcnow()
    assert q.process_one(Session,now)
    with Session() as db:
        job=db.query(EmailOutbox).one()
        job.completed_at=now-timedelta(days=8)
        db.commit()
        q.prune(db,now)
        assert db.query(EmailOutbox).count()==0
        assert db.query(User).count()==db.query(EmailVerificationToken).count()==1


@pytest.mark.parametrize("role,status",[("student",403),("lecturer",403),("admin",200)])
def test_delivery_monitoring_is_admin_only_and_returns_no_recipient_or_payload(env,role,status):
    client,Session=env
    user_id,_=seed(Session,role=role)
    response=client.get("/api/v1/system/email-delivery",headers={"Authorization":f"Bearer {create_access_token(user_id)}"})
    assert response.status_code==status
    assert "example.com" not in response.text and "encrypted_payload" not in response.text
    assert client.get("/api/v1/system/email-delivery").status_code==401


def test_expired_signup_keeps_chosen_password_for_a_fresh_resend(env):
    _,Session=env
    user_id,_=seed(Session,now=q.utcnow()-timedelta(days=2))
    with Session() as db: assert ev.latest_pending_password_hash(db,db.get(User,user_id))=="chosen-hash"


@pytest.mark.parametrize("error,code,retryable",[
    (smtplib.SMTPAuthenticationError(535,b"re_secret"),"AUTH_FAILED",True),
    (smtplib.SMTPDataError(550,b"daily quota exceeded re_secret"),"DAILY_QUOTA",True),
    (smtplib.SMTPDataError(550,b"monthly quota exceeded"),"MONTHLY_QUOTA",True),
    (smtplib.SMTPRecipientsRefused({"secret@example.com":(550,b"invalid")}),"RECIPIENT_REJECTED",False),
])
def test_provider_error_classification_keeps_sensitive_replies_out_of_errors(error,code,retryable):
    assert mailer._classify_error(error)==(code,retryable)
