"""Exercise ownership and history guards using real authenticated HTTP requests."""
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.api import deps
from app.api.endpoints import users
from app.core import security
from app.core.database import Base
from app.models.accommodation import BiometricPreference
from app.models.exam_assignment import ExamAssignment
from app.models.exam_session import ExamSession
from app.models.exam_sitting import ExamSitting
from app.models.user import User


@pytest.fixture()
def env(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'role.db').as_posix()}",
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def database():
        with sessions() as db:
            yield db

    app = FastAPI()
    app.include_router(users.router, prefix="/api/v1/users")
    app.dependency_overrides[deps.get_db] = database
    with sessions() as db:
        user = User(email="correct@example.com", hashed_password="unused", role="student",
                    full_name="Same owner", email_verified=True, face_embedding="preserve-face",
                    voice_embedding="preserve-voice", is_active=True)
        other = User(email="other@example.com", hashed_password="unused", role="student", email_verified=True)
        db.add_all([user, other])
        db.commit()
        uid, other_id = user.id, other.id
        db.add(BiometricPreference(user_id=uid, mode="covered"))
        db.commit()
    headers = {"Authorization": "Bearer " + security.create_access_token(uid)}
    return TestClient(app), sessions, uid, other_id, headers


def change(client, headers, **extra):
    return client.post("/api/v1/users/me/account-type", headers=headers,
                       json={"current_role": "student", "role": "lecturer", **extra})


def test_unused_owner_corrects_choice_and_revokes_old_sessions(env):
    client, sessions, uid, other_id, headers = env
    assert client.get("/api/v1/users/me/account-type", headers=headers).json()["can_change"]
    result = change(client, headers)
    assert result.status_code == 200, result.text
    assert result.json()["user"]["role"] == "lecturer"
    assert client.get("/api/v1/users/me", headers=headers).status_code == 401
    new_headers = {"Authorization": "Bearer " + result.json()["access_token"]}
    assert client.get("/api/v1/users/me", headers=new_headers).json()["id"] == uid
    with sessions() as db:
        user = db.get(User, uid)
        assert user.email == "correct@example.com" and user.full_name == "Same owner"
        assert user.face_embedding == "preserve-face" and user.voice_embedding == "preserve-voice"
        assert db.get(BiometricPreference, uid).mode == "covered"
        assert db.get(User, other_id).role == "student"
    back = client.post("/api/v1/users/me/account-type", headers=new_headers,
                       json={"current_role": "lecturer", "role": "student"})
    assert back.status_code == 200


@pytest.mark.parametrize("role", ["admin", "hr", "assistant", "", "LECTURER"])
def test_cannot_request_privileged_or_unknown_role(env, role):
    client, _, _, _, headers = env
    assert change(client, headers, role=role).status_code == 422


def test_cannot_change_another_user_or_skip_authentication(env):
    client, _, _, other_id, headers = env
    assert change(client, {}, user_id=other_id).status_code in {401, 403}
    assert change(client, headers, user_id=other_id).status_code == 422


@pytest.mark.parametrize("field,value", [
    ("email_verified", False), ("role", "admin"), ("role", "hr"), ("is_active", False),
    ("plan_tier", "basic"), ("exams_created_count", 1), ("lifetime_attempts_started", 1),
    ("cycle_attempts_started", 1), ("bonus_exams", 1), ("custom_max_attempts", 150),
    ("plan_started_at", datetime.utcnow()),
])
def test_identity_billing_and_usage_guards(env, field, value):
    client, sessions, uid, _, headers = env
    with sessions() as db:
        setattr(db.get(User, uid), field, value)
        db.commit()
    assert change(client, headers).status_code in {401, 409}
    with sessions() as db:
        assert db.get(User, uid).role == (value if field == "role" else "student")


@pytest.mark.parametrize("activity", ["assignment", "sitting", "legacy_seat", "team_owner", "assistant"])
def test_cannot_orphan_exam_or_team_records(env, activity):
    client, sessions, uid, other_id, headers = env
    with sessions() as db:
        if activity == "assignment":
            db.add(ExamAssignment(student_id=uid, assigned_by=other_id))
        elif activity == "sitting":
            db.add(ExamSitting(user_id=uid, exam_key="test", deadline_at=datetime.utcnow() + timedelta(minutes=2)))
        elif activity == "legacy_seat":
            db.add(ExamSession(account_id=other_id, student_key=f"u:{uid}", expires_at=datetime.utcnow()))
        elif activity == "team_owner":
            db.get(User, other_id).owner_id = uid
        else:
            db.get(User, uid).owner_id = other_id
        db.commit()
    assert change(client, headers).status_code == 409
    assert not client.get("/api/v1/users/me/account-type", headers=headers).json()["can_change"]


def test_stale_choice_and_noop_do_not_change_identity(env):
    client, _, _, _, headers = env
    assert change(client, headers, current_role="lecturer").status_code == 409
    assert change(client, headers, role="student").status_code == 400
