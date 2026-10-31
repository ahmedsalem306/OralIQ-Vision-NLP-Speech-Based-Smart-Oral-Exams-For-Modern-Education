"""
Billing / subscription tests — isolated app + temporary SQLite DB (never touches the real DB,
never loads AI models). Run:  pytest app/tests/test_billing.py -q
"""
import hashlib
import hmac
import json
import os
import time
from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api import deps
from app.api.api_router import api_router
from app.api.endpoints import exams as exams_ep
from app.core import security
from app.core.database import Base
import app.models  # noqa: F401  (register all models)
from app.models.exam_submission import ExamSubmission
from app.models.payment import Payment
from app.models.question import Question
from app.models.user import User
from app.services.billing_service import utcnow
from app.services.payment_gateways import PAYMOB_HMAC_FIELDS


@pytest.fixture()
def env(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'billing.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def _get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.dependency_overrides[deps.get_db] = _get_db

    # No real AI during tests
    monkeypatch.setattr(exams_ep, "_run_ai_pipeline", lambda *a, **k: {
        "transcript": "x", "nlp_score": 80.0, "speech_score": 80.0, "voice_score": None,
        "facial_score": 100.0, "cheat_report": None, "fluency_report": None,
    })
    for var in ("PAYMOB_API_KEY", "PAYMOB_CARD_INTEGRATION_ID", "PAYMOB_IFRAME_ID", "STRIPE_SECRET_KEY"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("BILLING_SANDBOX", "1")
    monkeypatch.setenv("PAYMOB_HMAC_SECRET", "test-hmac")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")

    yield TestClient(app), Session


def make_user(Session, email, role="lecturer", **fields):
    db = Session()
    u = User(email=email, hashed_password="x", full_name=email.split("@")[0], role=role, **fields)
    db.add(u)
    db.commit()
    db.refresh(u)
    token = security.create_access_token(u.id, expires_delta=timedelta(hours=1))
    uid = u.id
    db.close()
    return uid, {"Authorization": f"Bearer {token}"}


def new_exam(client, headers, duration=2, group=None):
    body = {"text": "What is X?", "model_answer": "A", "duration_minutes": duration}
    if group:
        body["group_token"] = group
    return client.post("/api/v1/questions/", json=body, headers=headers)


def get_user(Session, uid):
    db = Session()
    u = db.query(User).filter(User.id == uid).first()
    db.expunge(u)
    db.close()
    return u


def update_user(Session, uid, **fields):
    db = Session()
    u = db.query(User).filter(User.id == uid).first()
    for k, v in fields.items():
        setattr(u, k, v)
    db.commit()
    db.close()


# ── Free plan ─────────────────────────────────────────────────────────────────

def test_free_plan_exam_quota_is_lifetime_5(env):
    client, Session = env
    _, h = make_user(Session, "free@t.com")
    for _ in range(5):
        assert new_exam(client, h).status_code == 200
    r = new_exam(client, h)
    assert r.status_code == 402
    assert r.json()["detail"]["code"] == "EXAM_QUOTA_EXCEEDED"


def test_free_plan_question_and_duration_limits(env):
    client, Session = env
    _, h = make_user(Session, "free2@t.com")
    g = new_exam(client, h).json()["group_token"]
    assert new_exam(client, h, group=g).status_code == 200
    assert new_exam(client, h, group=g).status_code == 200
    r = new_exam(client, h, group=g)  # 4th question
    assert r.status_code == 402 and r.json()["detail"]["code"] == "QUESTIONS_PER_EXAM_EXCEEDED"
    r = new_exam(client, h, duration=3)  # free max 2 minutes
    assert r.status_code == 402 and r.json()["detail"]["code"] == "DURATION_EXCEEDED"
    # extra questions in a group do not consume exams
    assert client.get("/api/v1/billing/status", headers=h).json()["usage"]["exams_used"] == 1


def test_cannot_add_question_to_someone_elses_exam(env):
    client, Session = env
    _, h1 = make_user(Session, "a@t.com")
    _, h2 = make_user(Session, "b@t.com")
    g = new_exam(client, h1).json()["group_token"]
    assert new_exam(client, h2, group=g).status_code == 403


def test_register_cannot_self_assign_admin(env):
    client, _ = env
    r = client.post("/api/v1/register", json={"email": "evil@t.com", "password": "p", "role": "admin"})
    assert r.status_code in (400, 422)


# ── Checkout / activation ─────────────────────────────────────────────────────

def test_upgrade_without_gateway_and_sandbox_does_not_activate(env, monkeypatch):
    client, Session = env
    monkeypatch.setenv("BILLING_SANDBOX", "0")
    uid, h = make_user(Session, "nopay@t.com")
    r = client.post("/api/v1/billing/upgrade", json={"plan_id": "campus"}, headers=h)
    assert r.status_code == 503
    assert get_user(Session, uid).plan_tier == "free"


def test_sandbox_checkout_activates_basic_plan(env):
    client, Session = env
    uid, h = make_user(Session, "basic@t.com")
    r = client.post("/api/v1/billing/checkout", json={"plan_id": "pro", "period": "monthly"}, headers=h)
    assert r.status_code == 200, r.text
    u = get_user(Session, uid)
    assert u.plan_tier == "pro"
    assert 29 <= (u.plan_expires_at - utcnow()).days <= 30
    st = client.get("/api/v1/billing/status", headers=h).json()
    assert st["usage"]["exams_limit"] == 15
    assert st["usage"]["max_questions_per_exam"] == 5
    assert st["usage"]["students_limit"] == 150


def test_term_price_and_renewal_extends_expiry(env):
    client, Session = env
    uid, h = make_user(Session, "term@t.com")
    r = client.post("/api/v1/billing/checkout", json={"plan_id": "pro", "period": "term"}, headers=h)
    assert r.json()["amount"] == 597
    first_exp = get_user(Session, uid).plan_expires_at
    client.post("/api/v1/billing/checkout", json={"plan_id": "pro", "period": "monthly"}, headers=h)
    assert (get_user(Session, uid).plan_expires_at - first_exp).days == 30


def test_enterprise_not_self_purchasable(env):
    client, Session = env
    _, h = make_user(Session, "ent@t.com")
    assert client.post("/api/v1/billing/checkout", json={"plan_id": "enterprise"}, headers=h).status_code == 400


def test_monthly_cycle_resets_and_no_rollover(env):
    client, Session = env
    uid, h = make_user(Session, "cycle@t.com")
    client.post("/api/v1/billing/checkout", json={"plan_id": "pro", "period": "yearly"}, headers=h)
    for _ in range(3):
        new_exam(client, h)
    assert client.get("/api/v1/billing/status", headers=h).json()["usage"]["exams_used"] == 3
    u = get_user(Session, uid)
    update_user(Session, uid, cycle_started_at=u.cycle_started_at - timedelta(days=31))
    usage = client.get("/api/v1/billing/status", headers=h).json()["usage"]
    assert usage["exams_used"] == 0 and usage["exams_remaining"] == 15


def test_expired_plan_falls_back_to_free_after_grace(env):
    client, Session = env
    uid, h = make_user(Session, "exp@t.com")
    client.post("/api/v1/billing/checkout", json={"plan_id": "pro"}, headers=h)
    update_user(Session, uid, plan_expires_at=utcnow() - timedelta(days=2))
    assert client.get("/api/v1/billing/status", headers=h).json()["plan_tier"] == "pro"  # grace
    update_user(Session, uid, plan_expires_at=utcnow() - timedelta(days=4))
    assert client.get("/api/v1/billing/status", headers=h).json()["plan_tier"] == "free"


def test_addon_pack_used_after_monthly_quota(env):
    client, Session = env
    uid, h = make_user(Session, "addon@t.com")
    assert client.post("/api/v1/billing/checkout", json={"kind": "addon"}, headers=h).status_code == 400  # free
    client.post("/api/v1/billing/checkout", json={"plan_id": "pro"}, headers=h)
    r = client.post("/api/v1/billing/checkout", json={"kind": "addon"}, headers=h)
    assert r.status_code == 200 and r.json()["amount"] == 79
    for _ in range(15):
        assert new_exam(client, h).status_code == 200
    assert new_exam(client, h).status_code == 200  # from bonus
    assert get_user(Session, uid).bonus_exams == 9


# ── Webhooks ──────────────────────────────────────────────────────────────────

def _paymob_obj(reference, amount_cents, success=True):
    return {
        "amount_cents": amount_cents, "created_at": "2026-10-31T10:00:00", "currency": "EGP",
        "error_occured": False, "has_parent_transaction": False, "id": 987, "integration_id": 1,
        "is_3d_secure": True, "is_auth": False, "is_capture": False, "is_refunded": False,
        "is_standalone_payment": True, "is_voided": False, "owner": 5, "pending": False,
        "success": success, "order": {"id": 111, "merchant_order_id": reference},
        "source_data": {"pan": "2346", "sub_type": "MasterCard", "type": "card"},
    }


def _paymob_sign(obj):
    concat = ""
    for f in PAYMOB_HMAC_FIELDS:
        v = obj
        for p in f.split("."):
            v = v.get(p, "") if isinstance(v, dict) else ""
        concat += ("true" if v else "false") if isinstance(v, bool) else str(v)
    return hmac.new(b"test-hmac", concat.encode(), hashlib.sha512).hexdigest()


def _pending_payment(Session, uid, amount=199, plan="pro"):
    db = Session()
    p = Payment(user_id=uid, kind="plan", plan_id=plan, period="monthly", amount=amount, currency="EGP", provider="paymob",
                provider_txn_id="paymob_order:111")  # what paymob_create_checkout records
    db.add(p)
    db.commit()
    ref = p.reference
    db.close()
    return ref


def test_paymob_webhook_requires_valid_hmac(env):
    client, Session = env
    uid, _ = make_user(Session, "pm@t.com")
    ref = _pending_payment(Session, uid)
    obj = _paymob_obj(ref, 19900)
    assert client.post("/api/v1/billing/webhook/paymob", json={"obj": obj}).status_code == 401
    assert client.post("/api/v1/billing/webhook/paymob?hmac=deadbeef", json={"obj": obj}).status_code == 401
    assert get_user(Session, uid).plan_tier == "free"
    r = client.post(f"/api/v1/billing/webhook/paymob?hmac={_paymob_sign(obj)}", json={"obj": obj})
    assert r.status_code == 200 and r.json()["status"] == "paid"
    assert get_user(Session, uid).plan_tier == "pro"
    # idempotent replay
    r = client.post(f"/api/v1/billing/webhook/paymob?hmac={_paymob_sign(obj)}", json={"obj": obj})
    assert r.json().get("already_applied") is True


def test_paymob_signed_callback_cannot_be_repointed(env):
    """merchant_order_id is not covered by the HMAC: swapping it must not pay another payment."""
    client, Session = env
    uid, _ = make_user(Session, "pm3@t.com")
    _pending_payment(Session, uid)                       # the order that was really paid (order.id 111)
    db = Session()
    other = Payment(user_id=uid, kind="plan", plan_id="pro", period="monthly", amount=199, currency="EGP",
                    provider="paymob", provider_txn_id="paymob_order:222")
    db.add(other)
    db.commit()
    other_ref = other.reference
    db.close()
    obj = _paymob_obj(other_ref, 19900)                  # signed fields still say order.id == 111
    r = client.post(f"/api/v1/billing/webhook/paymob?hmac={_paymob_sign(obj)}", json={"obj": obj})
    assert r.status_code == 200 and r.json()["matched"] is False
    assert get_user(Session, uid).plan_tier == "free"


def test_paymob_amount_mismatch_rejected(env):
    client, Session = env
    uid, _ = make_user(Session, "pm2@t.com")
    ref = _pending_payment(Session, uid, amount=599, plan="campus")
    obj = _paymob_obj(ref, 100)  # paid 1 EGP instead of 599
    r = client.post(f"/api/v1/billing/webhook/paymob?hmac={_paymob_sign(obj)}", json={"obj": obj})
    assert r.json()["status"] == "amount_mismatch"
    assert get_user(Session, uid).plan_tier == "free"


def test_stripe_webhook_signature(env):
    client, Session = env
    uid, _ = make_user(Session, "st@t.com")
    db = Session()
    p = Payment(user_id=uid, kind="plan", plan_id="campus", period="monthly", amount=12, currency="USD", provider="stripe")
    db.add(p)
    db.commit()
    ref = p.reference
    db.close()
    payload = json.dumps({"type": "checkout.session.completed", "data": {"object": {
        "id": "cs_1", "client_reference_id": ref, "payment_status": "paid", "amount_total": 1200, "currency": "usd",
    }}}).encode()
    bad = client.post("/api/v1/billing/webhook/stripe", content=payload, headers={"Stripe-Signature": "t=1,v1=bad"})
    assert bad.status_code == 401
    ts = int(time.time())
    sig = hmac.new(b"whsec_test", f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    ok = client.post("/api/v1/billing/webhook/stripe", content=payload, headers={"Stripe-Signature": f"t={ts},v1={sig}"})
    assert ok.status_code == 200 and ok.json()["status"] == "paid"
    assert get_user(Session, uid).plan_tier == "campus"


# ── Students limit ────────────────────────────────────────────────────────────

def test_concurrent_limit_counts_students_in_exam_at_same_time(env):
    """Free plan = 50 students AT THE SAME TIME. Finished students free their seat."""
    client, Session = env
    owner_id, h = make_user(Session, "lim@t.com")
    qid = new_exam(client, h).json()["id"]
    token = client.get("/api/v1/questions/", headers=h).json()[0]["group_token"]

    # 50 students currently inside the exam
    from app.models.exam_session import ExamSession
    db = Session()
    for i in range(50):
        db.add(ExamSession(account_id=owner_id, student_key=f"n:S{i}", group_token=token,
                           started_at=utcnow(), expires_at=utcnow() + timedelta(minutes=10)))
    db.commit()
    db.close()

    sid, sh = make_user(Session, "stud51@t.com", role="student")
    r = client.get(f"/api/v1/exams/access-check/{token}", headers=sh)
    assert r.status_code == 402 and r.json()["detail"]["code"] == "CONCURRENT_LIMIT_REACHED"

    # One student finishes -> a seat frees up -> the new student can enter
    db = Session()
    db.query(ExamSession).filter(ExamSession.student_key == "n:S0").update({ExamSession.finished: True})
    db.commit()
    db.close()
    assert client.get(f"/api/v1/exams/access-check/{token}", headers=sh).status_code == 200

    # Submitting the (only/last) question releases the seat again
    form = {"question_id": qid, "student_name": "x", "student_number": "S999"}
    assert client.post("/api/v1/exams/submit", data=form, headers=sh).status_code == 200
    db = Session()
    open_seats = db.query(ExamSession).filter(ExamSession.finished.is_(False), ExamSession.expires_at > utcnow()).count()
    db.close()
    assert open_seats == 49

    # Many students finishing over time never "uses up" the plan
    for i in range(60):
        _, hh = make_user(Session, f"later{i}@t.com", role="student")
        db = Session()
        db.query(ExamSession).filter(ExamSession.finished.is_(False)).update({ExamSession.finished: True})
        db.commit()
        db.close()
        assert client.get(f"/api/v1/exams/access-check/{token}", headers=hh).status_code == 200


# ── Team / assistants ─────────────────────────────────────────────────────────

def test_team_assistants_share_owner_quota(env):
    client, Session = env
    owner_id, oh = make_user(Session, "owner@t.com")
    asst_id, ah = make_user(Session, "asst@t.com")
    # Basic plan has no assistant seats
    client.post("/api/v1/billing/checkout", json={"plan_id": "pro"}, headers=oh)
    assert client.post("/api/v1/billing/team", json={"email": "asst@t.com"}, headers=oh).status_code == 402
    client.post("/api/v1/billing/checkout", json={"plan_id": "campus"}, headers=oh)
    assert client.post("/api/v1/billing/team", json={"email": "asst@t.com"}, headers=oh).status_code == 200
    assert new_exam(client, ah, duration=10).status_code == 200  # campus limits apply to assistant
    assert get_user(Session, owner_id).cycle_exams_used == 1
    st = client.get("/api/v1/billing/status", headers=ah).json()
    assert st["is_team_member"] is True and st["plan_tier"] == "campus"
    # assistant can't buy
    assert client.post("/api/v1/billing/checkout", json={"plan_id": "pro"}, headers=ah).status_code == 400


def test_admin_grant_enterprise_custom_limits(env):
    client, Session = env
    _, adm = make_user(Session, "admin@t.com", role="admin")
    uid, h = make_user(Session, "school@t.com")
    r = client.post("/api/v1/billing/admin/grant", headers=adm, json={
        "email": "school@t.com", "plan_id": "enterprise", "months": 4,
        "custom_max_students": 300, "custom_max_exams": 120, "amount": 9000,
    })
    assert r.status_code == 200, r.text
    usage = client.get("/api/v1/billing/status", headers=h).json()["usage"]
    assert usage["students_limit"] == 300 and usage["exams_limit"] == 120
    # non-admin forbidden
    assert client.post("/api/v1/billing/admin/grant", headers=h, json={"email": "school@t.com"}).status_code == 403
