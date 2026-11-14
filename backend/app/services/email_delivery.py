"""Bounded, encrypted verification-mail outbox. All times are naive UTC.

One global database lease serializes SMTP sends, including across worker processes.
Reservations are conservative local counters, not the provider's account usage.
"""
import base64
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy import func, text
from app.core.config import current_env, settings, ConfigError
from app.models.email_outbox import EmailOutbox, EmailDeliveryState
from app.models.email_verification import EmailVerificationToken
from app.models.user import User
from app.services import mailer

ACTIVE = ("queued", "processing")
TERMINAL = ("sent", "failed", "expired", "cancelled")


def utcnow():
    return datetime.utcnow()


def number(name, default, *, minimum=0, maximum=1_000_000):
    raw = os.environ.get(name, str(default)).strip()
    if not raw.isdigit() or not minimum <= int(raw) <= maximum:
        raise ConfigError(f"{name} must be an integer between {minimum} and {maximum}")
    return int(raw)


def queued_delivery():
    mode = (os.environ.get("EMAIL_DELIVERY_MODE") or ("queued" if current_env() == "production" else "inline")).strip().lower()
    if mode not in ("queued", "inline") or (current_env() == "production" and mode != "queued"):
        raise ConfigError("EMAIL_DELIVERY_MODE must be queued in production; inline is for development/tests")
    return mode == "queued"


def capacity():
    return number("EMAIL_QUEUE_MAX_PENDING", 1000, minimum=1, maximum=10000)


def _cipher():
    # Domain-separated subkey; preserve SECRET_KEY with the encrypted DB backups.
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
               info=b"oraliq-email-outbox-v1").derive(settings.SECRET_KEY.encode())
    return Fernet(base64.urlsafe_b64encode(key))


def pending_count(db):
    return db.query(func.count(EmailOutbox.id)).filter(EmailOutbox.status.in_(ACTIVE)).scalar() or 0


def queue_full(db):
    return queued_delivery() and pending_count(db) >= capacity()


def enqueue(db, token, kind, recipient, subject, body):
    if db.bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(720342118)"))
    if pending_count(db) >= capacity():
        return False
    payload = json.dumps({"to": recipient, "subject": subject, "text": body}, ensure_ascii=False).encode()
    if len(payload) > 32768:
        raise ValueError("Mail payload exceeds supported size")
    now = utcnow()
    db.add(EmailOutbox(token_id=token.id, kind=kind,
                       encrypted_payload=_cipher().encrypt(payload).decode(),
                       delivery_key=uuid.uuid4().hex, created_at=now, next_attempt_at=now,
                       expires_at=token.expires_at if kind == "verification" else now + timedelta(hours=24)))
    return True


def _state(db):
    dialect = db.bind.dialect.name
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        raise RuntimeError("Unsupported email queue database")
    db.execute(insert(EmailDeliveryState).values(id=1).on_conflict_do_nothing(index_elements=["id"]))
    return db.query(EmailDeliveryState).filter_by(id=1).with_for_update().one()


def _roll_counters(state, now):
    day, month = now.strftime("%Y-%m-%d"), now.strftime("%Y-%m")
    if state.day_key != day:
        state.day_key, state.day_reserved = day, 0
    if state.month_key != month:
        state.month_key, state.month_reserved = month, 0


def _tomorrow(now):
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def _next_month(now):
    return (now.replace(day=28) + timedelta(days=4)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _quota_wait(state, now):
    daily = number("EMAIL_DAILY_SEND_LIMIT", 90)
    monthly = number("EMAIL_MONTHLY_SEND_LIMIT", 2700)
    if monthly and state.month_reserved >= monthly:
        return _next_month(now), "MONTHLY_BUDGET"
    if daily and state.day_reserved >= daily:
        return _tomorrow(now), "DAILY_BUDGET"
    return None, None


def _close(job, status, code, now):
    job.status, job.error_code, job.completed_at = status, code, now
    job.encrypted_payload = None
    job.lease_until = job.lease_token = None


@dataclass(frozen=True)
class ClaimedMail:
    id: int
    nonce: str
    delivery_key: str
    recipient: str
    subject: str
    body: str


def claim(db, now=None):
    now = now or utcnow()
    state = _state(db)
    _roll_counters(state, now)
    if not state.last_seen_at or state.last_seen_at < now - timedelta(seconds=15):
        state.last_seen_at = now
    db.query(EmailOutbox).filter(EmailOutbox.status == "processing", EmailOutbox.lease_until <= now).update(
        {EmailOutbox.status: "queued", EmailOutbox.lease_token: None, EmailOutbox.lease_until: None}, synchronize_session=False)
    db.query(EmailOutbox).filter(EmailOutbox.status == "queued", EmailOutbox.expires_at <= now).update(
        {EmailOutbox.status: "expired", EmailOutbox.encrypted_payload: None,
         EmailOutbox.error_code: "EXPIRED", EmailOutbox.completed_at: now}, synchronize_session=False)
    if not mailer.configured() or (state.busy_until and state.busy_until > now):
        db.commit()
        return None
    quota_until, _ = _quota_wait(state, now)
    waits = [value for value in (quota_until, state.pause_until, state.next_send_at) if value and value > now]
    if waits:
        db.commit()
        return None
    job = db.query(EmailOutbox).filter(EmailOutbox.status == "queued", EmailOutbox.next_attempt_at <= now,
                                     EmailOutbox.expires_at > now).order_by(EmailOutbox.created_at, EmailOutbox.id).with_for_update(skip_locked=True).first()
    if not job:
        db.commit()
        return None
    token = db.get(EmailVerificationToken, job.token_id)
    user = db.get(User, token.user_id) if token else None
    if not user or not user.is_active or user.email != token.sent_to or (job.kind == "verification" and (
            token.used_at is not None or token.expires_at <= now or user.email_verified or user.google_sub)):
        _close(job, "cancelled", "NO_LONGER_APPLICABLE", now)
        db.commit()
        return None
    try:
        payload = json.loads(_cipher().decrypt(job.encrypted_payload.encode()))
        if set(payload) != {"to", "subject", "text"} or payload["to"] != token.sent_to or not all(isinstance(v, str) for v in payload.values()):
            raise ValueError("Invalid payload")
    except (InvalidToken, ValueError, TypeError, AttributeError, UnicodeError):
        _close(job, "failed", "PAYLOAD_INVALID", now)
        db.commit()
        return None
    if job.attempts >= number("EMAIL_MAX_ATTEMPTS", 8, minimum=1, maximum=30):
        _close(job, "failed", "ATTEMPTS_EXHAUSTED", now)
        db.commit()
        return None
    job.status, job.lease_token = "processing", uuid.uuid4().hex
    job.lease_until = now + timedelta(seconds=180)
    job.attempts += 1
    state.busy_until = job.lease_until
    state.next_send_at = now + timedelta(seconds=number("EMAIL_MIN_INTERVAL_SECONDS", 1, minimum=1, maximum=60))
    state.day_reserved += 1
    state.month_reserved += 1
    result = ClaimedMail(job.id, job.lease_token, job.delivery_key, payload["to"], payload["subject"], payload["text"])
    db.commit()
    return result


def finish(db, item, error=None, now=None):
    now = now or utcnow()
    state = _state(db)
    job = db.query(EmailOutbox).filter_by(id=item.id).with_for_update().first()
    if not job or job.status != "processing" or job.lease_token != item.nonce:
        db.rollback()
        return False
    state.busy_until = None
    if error is None:
        _close(job, "sent", None, now)
        state.last_error_code = state.last_error_at = state.pause_until = None
    else:
        code = error.code if isinstance(error, mailer.MailError) else "TRANSPORT_FAILED"
        allowed = {"AUTH_FAILED", "RECIPIENT_TEMPORARY", "RECIPIENT_REJECTED", "MONTHLY_QUOTA", "DAILY_QUOTA",
                   "PROVIDER_LIMIT", "PROVIDER_REJECTED", "TRANSPORT_FAILED", "PAYLOAD_INVALID", "DELIVERY_FAILED"}
        code = code if code in allowed else "DELIVERY_FAILED"
        state.last_error_code, state.last_error_at, job.error_code = code, now, code
        retryable = error.retryable if isinstance(error, mailer.MailError) else True
        if not retryable or job.attempts >= number("EMAIL_MAX_ATTEMPTS", 8, minimum=1, maximum=30):
            _close(job, "failed", code, now)
        else:
            delay = min(900, 30 * 2 ** min(job.attempts - 1, 5))
            until = _tomorrow(now) if code == "DAILY_QUOTA" else _next_month(now) if code == "MONTHLY_QUOTA" else now + timedelta(seconds=300 if code == "AUTH_FAILED" else delay)
            job.status, job.next_attempt_at = "queued", until
            job.lease_until = job.lease_token = None
            if code not in ("RECIPIENT_TEMPORARY", "RECIPIENT_REJECTED"):
                state.pause_until = until
    db.commit()
    return True


def process_one(session_factory, now=None):
    with session_factory() as db:
        item = claim(db, now)
    if not item:
        return False
    error = None
    try:
        mailer.send(item.recipient, item.subject, item.body, idempotency_key="oraliq-mail/" + item.delivery_key)
    except Exception as caught:
        # No recipient, payload, provider reply or exception message enters diagnostics.
        error = caught
    with session_factory() as db:
        finish(db, item, error, now)
    return True


def metrics(db, now=None):
    now = now or utcnow()
    state = db.get(EmailDeliveryState, 1)
    counts = dict(db.query(EmailOutbox.status, func.count(EmailOutbox.id)).group_by(EmailOutbox.status).all())
    day = state.day_reserved if state and state.day_key == now.strftime("%Y-%m-%d") else 0
    month = state.month_reserved if state and state.month_key == now.strftime("%Y-%m") else 0
    daily, monthly = number("EMAIL_DAILY_SEND_LIMIT", 90), number("EMAIL_MONTHLY_SEND_LIMIT", 2700)
    seen = state.last_seen_at if state else None
    issues = []
    if not mailer.configured(): issues.append("NOT_CONFIGURED")
    if queued_delivery() and (not seen or seen < now - timedelta(seconds=90)): issues.append("WORKER_UNAVAILABLE")
    pending = sum(counts.get(s, 0) for s in ACTIVE)
    if pending >= capacity(): issues.append("QUEUE_FULL")
    elif pending >= capacity() * .8: issues.append("QUEUE_NEAR_CAPACITY")
    if daily and day >= daily: issues.append("DAILY_BUDGET")
    elif daily and day >= daily * .8: issues.append("DAILY_BUDGET_WARNING")
    if monthly and month >= monthly: issues.append("MONTHLY_BUDGET")
    elif monthly and month >= monthly * .8: issues.append("MONTHLY_BUDGET_WARNING")
    if state and state.pause_until and state.pause_until > now: issues.append(state.last_error_code or "PROVIDER_PAUSED")
    if state and state.last_error_code == "AUTH_FAILED" and "AUTH_FAILED" not in issues: issues.append("AUTH_FAILED")
    if counts.get("failed", 0): issues.append("FAILED_MESSAGES")
    if counts.get("expired", 0): issues.append("EXPIRED_MESSAGES")
    waits = [value for value in (state.pause_until if state else None,
             _next_month(now) if monthly and month >= monthly else None,
             _tomorrow(now) if daily and day >= daily else None) if value and value > now]
    return {"mode": "queued" if queued_delivery() else "inline", "issues": issues,
            "counts": {s: counts.get(s, 0) for s in (*ACTIVE, *TERMINAL)},
            "pending": pending, "capacity": capacity(), "day_reserved": day, "daily_limit": daily,
            "month_reserved": month, "monthly_limit": monthly,
            "worker_seen_at": seen.isoformat() + "Z" if seen else None,
            "pause_until": max(waits).isoformat() + "Z" if waits else None,
            "counter_scope": "local_send_reservations_utc"}


def prune(db, now=None):
    cutoff = (now or utcnow()) - timedelta(days=7)
    db.query(EmailOutbox).filter(EmailOutbox.status.in_(TERMINAL), EmailOutbox.completed_at < cutoff).delete(synchronize_session=False)
    db.commit()
