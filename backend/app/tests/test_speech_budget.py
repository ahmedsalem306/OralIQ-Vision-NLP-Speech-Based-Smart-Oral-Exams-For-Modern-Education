from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.speech_config import SpeechProviderDeferred
from app.models.speech_usage import SpeechProviderControl, SpeechProviderUsage
from app.services import speech_budget


@pytest.fixture
def factory(tmp_path):
    engine = create_engine('sqlite:///' + (tmp_path / 'speech.db').as_posix(), connect_args={'timeout': 30})
    for table in (SpeechProviderControl.__table__, SpeechProviderUsage.__table__):
        table.create(engine)
    yield sessionmaker(bind=engine)
    engine.dispose()


def test_parallel_callers_share_one_durable_request_budget(factory, monkeypatch):
    monkeypatch.setenv('GROQ_REQUESTS_PER_MINUTE', '3')
    def attempt(_):
        try:
            speech_budget.reserve(10, session_factory=factory)
            return True
        except SpeechProviderDeferred:
            return False
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(attempt, range(20)))
    assert sum(results) == 3
    with factory() as db:
        assert db.query(SpeechProviderUsage).count() == 3
    # A fresh factory/process still sees the prior reservations.
    with pytest.raises(SpeechProviderDeferred):
        speech_budget.reserve(10, session_factory=sessionmaker(bind=factory.kw['bind']))


def test_audio_budget_waits_until_enough_audio_expires(factory, monkeypatch):
    monkeypatch.setenv('GROQ_AUDIO_SECONDS_PER_HOUR', '60')
    now = datetime(2026, 11, 16, 10)
    speech_budget.reserve(40, session_factory=factory, now=now)
    with pytest.raises(SpeechProviderDeferred) as error:
        speech_budget.reserve(30, session_factory=factory, now=now + timedelta(seconds=61))
    assert error.value.retry_after >= 3539
    speech_budget.reserve(30, session_factory=factory, now=now + timedelta(hours=1, seconds=1))


def test_daily_budget_and_minimum_audio_are_persisted(factory, monkeypatch):
    monkeypatch.setenv('GROQ_REQUESTS_PER_DAY', '1')
    now = datetime(2026, 11, 16, 10)
    speech_budget.reserve(.25, session_factory=factory, now=now)
    with factory() as db:
        assert db.query(SpeechProviderUsage).one().audio_seconds == 10
    with pytest.raises(SpeechProviderDeferred) as error:
        speech_budget.reserve(10, session_factory=factory, now=now + timedelta(hours=2))
    assert error.value.retry_after > 21 * 3600
    speech_budget.reserve(10, session_factory=factory, now=now + timedelta(days=1, seconds=1))
    with factory() as db:
        assert db.query(SpeechProviderUsage).count() == 1


def test_cooldown_is_shared_and_cannot_be_shortened(factory):
    now = datetime(2026, 11, 16, 10)
    speech_budget.block_for(120, session_factory=factory, now=now)
    speech_budget.block_for(5, session_factory=factory, now=now)
    with pytest.raises(SpeechProviderDeferred) as error:
        speech_budget.reserve(10, session_factory=factory, now=now)
    assert error.value.retry_after == 120
    with factory() as db:
        assert db.query(SpeechProviderUsage).count() == 0
    speech_budget.reserve(10, session_factory=factory, now=now + timedelta(seconds=121))


def test_postgres_callers_share_budget_and_persist_cooldown(monkeypatch):
    from sqlalchemy.engine import make_url
    url = os.environ.get('TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Requires the isolated PostgreSQL load-test database')
    assert (make_url(url).database or '').endswith('_loadtest')
    schema = 'speech_budget_' + uuid.uuid4().hex
    admin = create_engine(url)
    engine = None
    try:
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(url, connect_args={'options': f'-csearch_path={schema}'}, pool_size=10, max_overflow=10)
        for table in (SpeechProviderControl.__table__, SpeechProviderUsage.__table__):
            table.create(engine)
        factory = sessionmaker(bind=engine)
        monkeypatch.setenv('GROQ_REQUESTS_PER_MINUTE', '3')
        def attempt(_):
            try:
                speech_budget.reserve(10, session_factory=factory)
                return True
            except SpeechProviderDeferred:
                return False
        with ThreadPoolExecutor(max_workers=10) as pool:
            assert sum(pool.map(attempt, range(20))) == 3
        with factory() as db:
            assert db.query(SpeechProviderUsage).count() == 3
        speech_budget.block_for(120, session_factory=factory)
        with pytest.raises(SpeechProviderDeferred) as error:
            speech_budget.reserve(10, session_factory=sessionmaker(bind=engine))
        assert error.value.reason == 'groq_cooldown'
    finally:
        if engine is not None:
            engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin.dispose()
