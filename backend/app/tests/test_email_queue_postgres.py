"""Real PostgreSQL isolation/locking; disposable schema and memory-only mail transport."""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import app.models
from app.core.database import Base
from app.models.user import User
from app.models.email_verification import EmailVerificationToken
from app.models.email_outbox import EmailOutbox
from app.services import email_delivery as q, email_verification as ev

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_POSTGRES_URL"), reason="Requires isolated PostgreSQL test service")


@pytest.fixture()
def database(monkeypatch):
    monkeypatch.setenv("EMAIL_DELIVERY_MODE", "queued")
    monkeypatch.setenv("EMAIL_BACKEND", "memory")
    monkeypatch.setenv("FRONTEND_URL", "https://test.invalid")
    monkeypatch.setenv("EMAIL_QUEUE_MAX_PENDING", "1")
    schema = "oraliq_mail_" + uuid.uuid4().hex
    admin = create_engine(os.environ["TEST_POSTGRES_URL"])
    engine = None
    try:
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(os.environ["TEST_POSTGRES_URL"], connect_args={"options": f"-csearch_path={schema}"})
        Base.metadata.create_all(engine)
        yield sessionmaker(bind=engine, autoflush=False)
    finally:
        if engine is not None:
            engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin.dispose()


def test_concurrent_mail_admission_never_exceeds_capacity(database):
    Session = database
    barrier = Barrier(2)
    def add(index):
        with Session() as db:
            user = User(email=f"race-{index}@example.invalid", hashed_password="x", role="student")
            db.add(user); db.flush()
            raw = uuid.uuid4().hex
            token = EmailVerificationToken(user_id=user.id, sent_to=user.email, token_hash=ev.hash_token(raw),
                                           created_at=q.utcnow(), expires_at=q.utcnow()+timedelta(hours=24), pending_password_hash="x")
            db.add(token); db.flush()
            barrier.wait(timeout=15)
            accepted = q.enqueue(db, token, "verification", user.email, "Test", "Private test only")
            if accepted: db.commit()
            else: db.rollback()
            return accepted
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(add,range(2))) == [False, True]
    with Session() as db:
        assert db.query(EmailOutbox).count() == db.query(EmailVerificationToken).count() == db.query(User).count() == 1


def test_two_mail_workers_share_one_global_send_lease(database):
    Session = database
    with Session() as db:
        user=User(email="lease@example.invalid",hashed_password="x",role="student")
        db.add(user); db.flush()
        token=EmailVerificationToken(user_id=user.id,sent_to=user.email,token_hash=ev.hash_token(uuid.uuid4().hex),
                                     created_at=q.utcnow(),expires_at=q.utcnow()+timedelta(hours=24),pending_password_hash="x")
        db.add(token);db.flush()
        assert q.enqueue(db,token,"verification",user.email,"Test","Only an isolated locking test")
        db.commit()
    barrier=Barrier(2)
    now=q.utcnow()
    def take(_):
        with Session() as db:
            barrier.wait(timeout=15)
            return q.claim(db,now)
    with ThreadPoolExecutor(max_workers=2) as pool:
        claims=list(pool.map(take,range(2)))
    assert sum(item is not None for item in claims)==1


def test_simultaneous_resends_obey_per_account_throttle(database, monkeypatch):
    Session = database
    monkeypatch.setenv("EMAIL_QUEUE_MAX_PENDING", "10")
    with Session() as db:
        user = User(email="resend-race@example.invalid", hashed_password="x", role="student")
        db.add(user); db.commit()
        user_id = user.id
    barrier = Barrier(2)
    def request(_):
        with Session() as db:
            user = db.get(User, user_id)
            barrier.wait(timeout=15)
            return ev.issue_and_send(db, user, "pending-hash")
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(request, range(2))) == [False, True]
    with Session() as db:
        assert db.query(EmailOutbox).count() == db.query(EmailVerificationToken).count() == 1
