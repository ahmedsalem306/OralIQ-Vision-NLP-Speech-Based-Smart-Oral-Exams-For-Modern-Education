"""Cross-connection financial/admission races in a disposable PostgreSQL schema."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import os
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.exam_session import ExamSession
from app.models.user import User
from app.services import billing_service as billing

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_POSTGRES_URL"), reason="Requires isolated PostgreSQL")


@pytest.fixture()
def pg():
    url = os.environ["TEST_POSTGRES_URL"]
    assert url.rsplit("/", 1)[-1].endswith("_loadtest")
    schema = "attempt_quota_" + uuid.uuid4().hex
    admin = create_engine(url)
    engine = None
    try:
        with admin.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
        Base.metadata.create_all(engine)
        yield sessionmaker(bind=engine, expire_on_commit=False)
    finally:
        if engine is not None:
            engine.dispose()
        with admin.begin() as conn:
            conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin.dispose()


def test_last_five_credits_are_shared_across_real_connections(pg):
    with pg() as db:
        owner = User(email="pg-credit@example.com", plan_tier="free")
        db.add(owner)
        db.commit()
        oid = owner.id
    def reserve(_):
        with pg() as db:
            owner = db.get(User, oid)
            try:
                billing.refresh_account_state(db, owner)
                billing.consume_student_attempt(db, owner)
                db.commit()
                return 200
            except HTTPException as error:
                db.rollback()
                return error.status_code
    with ThreadPoolExecutor(max_workers=7) as pool:
        results = list(pool.map(reserve, range(7)))
    assert results.count(200) == 5 and results.count(402) == 2
    with pg() as db:
        assert db.get(User, oid).lifetime_attempts_started == 5


def test_concurrent_cycle_rollover_does_not_erase_reservations(pg):
    with pg() as db:
        owner = User(email="pg-rollover@example.com", plan_tier="pro",
                     plan_expires_at=billing.utcnow() + timedelta(days=200),
                     cycle_started_at=billing.utcnow() - timedelta(days=31),
                     cycle_attempts_started=50)
        db.add(owner)
        db.commit()
        oid = owner.id
    def reserve(_):
        with pg() as db:
            owner = db.get(User, oid)
            billing.refresh_account_state(db, owner)
            billing.consume_student_attempt(db, owner)
            db.commit()
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(reserve, range(2)))
    with pg() as db:
        assert db.get(User, oid).cycle_attempts_started == 2


def test_shared_launch_seats_cannot_be_oversubscribed(pg, monkeypatch):
    monkeypatch.setenv("LAUNCH_MAX_ACTIVE_EXAMS", "2")
    with pg() as db:
        owners = [User(email=f"pg-seat-{i}@example.com") for i in range(3)]
        db.add_all(owners)
        db.commit()
        ids = [owner.id for owner in owners]
    def reserve(oid):
        with pg() as db:
            try:
                billing.acquire_exam_seat(db, db.get(User, oid), None, str(oid), None)
                return 200
            except HTTPException as error:
                db.rollback()
                return error.status_code
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(reserve, ids))
    assert results.count(200) == 2 and results.count(503) == 1
    with pg() as db:
        assert db.query(ExamSession).count() == 2
