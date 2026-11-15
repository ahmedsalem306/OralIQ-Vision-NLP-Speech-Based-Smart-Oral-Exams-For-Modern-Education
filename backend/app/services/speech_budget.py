"""Shared durable rolling budgets: reserve BEFORE every Groq HTTP attempt.

An UPDATE on the control row serializes API and worker processes on PostgreSQL
and SQLite. Ambiguous/failed HTTP attempts remain charged conservatively; never
refund them or circumvent provider limits using another model/key/account.
"""
from datetime import datetime, timedelta
import math

from sqlalchemy import delete, update

from app.core.speech_config import SpeechProviderDeferred, SpeechProviderError, groq_settings
from app.models.speech_usage import SpeechProviderControl, SpeechProviderUsage


def _session(factory):
    if factory is None:
        from app.core.database import SessionLocal
        factory = SessionLocal
    return factory()


def _lock(db, now):
    dialect = db.get_bind().dialect.name
    if dialect == 'postgresql':
        from sqlalchemy.dialects.postgresql import insert
    elif dialect == 'sqlite':
        from sqlalchemy.dialects.sqlite import insert
    else:
        raise SpeechProviderError('unsupported_speech_budget_database')
    db.execute(insert(SpeechProviderControl).values(provider='groq', updated_at=now)
               .on_conflict_do_nothing(index_elements=['provider']))
    db.execute(update(SpeechProviderControl).where(SpeechProviderControl.provider == 'groq')
               .values(updated_at=now))
    return db.get(SpeechProviderControl, 'groq')


def reserve(audio_seconds, *, session_factory=None, now=None):
    settings = groq_settings()
    now = now or datetime.utcnow()
    seconds = max(10, math.ceil(audio_seconds))
    if seconds > min(settings.audio_hour, settings.audio_day):
        raise SpeechProviderError('recording_exceeds_configured_provider_window')
    with _session(session_factory) as db:
        control = _lock(db, now)
        if control.blocked_until and control.blocked_until > now:
            raise SpeechProviderDeferred('groq_cooldown', math.ceil((control.blocked_until - now).total_seconds()))
        db.execute(delete(SpeechProviderUsage).where(
            SpeechProviderUsage.provider == 'groq', SpeechProviderUsage.reserved_at <= now - timedelta(days=1)))
        events = db.query(SpeechProviderUsage).filter(SpeechProviderUsage.provider == 'groq').order_by(
            SpeechProviderUsage.reserved_at, SpeechProviderUsage.id).all()
        wait = 0
        for window, limit, audio in [(60, settings.rpm, False), (86400, settings.rpd, False),
                                     (3600, settings.audio_hour, True), (86400, settings.audio_day, True)]:
            recent = [event for event in events if event.reserved_at > now - timedelta(seconds=window)]
            excess = sum(event.audio_seconds if audio else 1 for event in recent) + (seconds if audio else 1) - limit
            if excess > 0:
                for event in recent:
                    excess -= event.audio_seconds if audio else 1
                    if excess <= 0:
                        wait = max(wait, math.ceil((event.reserved_at + timedelta(seconds=window) - now).total_seconds()) + 1)
                        break
        if wait:
            raise SpeechProviderDeferred('groq_budget', wait)
        db.add(SpeechProviderUsage(provider='groq', reserved_at=now, audio_seconds=seconds))
        db.commit()


def block_for(seconds, *, session_factory=None, now=None):
    now = now or datetime.utcnow()
    until = now + timedelta(seconds=max(1, min(86400, int(seconds))))
    with _session(session_factory) as db:
        control = _lock(db, now)
        if control.blocked_until is None or control.blocked_until < until:
            control.blocked_until = until
        db.commit()
