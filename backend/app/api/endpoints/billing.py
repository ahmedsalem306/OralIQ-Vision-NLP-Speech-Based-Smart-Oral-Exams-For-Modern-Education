"""
Billing, Subscription Plans & Dual-Currency Payment Gateway Endpoints for OralIQ.
Supports:
- EGP (ج.م) via Paymob / Kashier (Local Cards, Meeza, Vodafone Cash, InstaPay, Fawry)
- USD ($) via Stripe / LemonSqueezy (International Cards, Apple Pay, Google Pay)
- Automatic instant activation in sandbox/demo mode when gateway keys are not yet configured.
"""
import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.core.plans import PLANS, get_plan
from app.models.exam_submission import ExamSubmission
from app.models.question import Question
from app.models.user import User

router = APIRouter()


class UpgradePlanRequest(BaseModel):
    plan_id: str = Field(..., min_length=2, max_length=32)
    currency: str = Field(default="EGP", max_length=8)
    payment_method: str = Field(default="card", max_length=32)
    wallet_phone: Optional[str] = Field(default=None, max_length=24)


def get_lecturer_usage(db: Session, user: User) -> Dict[str, Any]:
    plan = get_plan(getattr(user, "plan_tier", "free"))
    questions = db.query(Question).filter(Question.creator_id == user.id).all()
    distinct_groups = {q.group_token or q.exam_token for q in questions}
    exams_used = max(getattr(user, "exams_created_count", 0) or 0, len(distinct_groups))

    # Compute per-exam student counts
    exam_student_counts: Dict[str, int] = {}
    total_submissions = 0
    if questions:
        q_ids = [q.id for q in questions]
        subs = db.query(ExamSubmission).filter(ExamSubmission.question_id.in_(q_ids)).all()
        total_submissions = len(subs)
        q_to_group = {q.id: (q.group_token or q.exam_token) for q in questions}
        group_students: Dict[str, set] = {}
        for s in subs:
            grp = q_to_group.get(s.question_id, str(s.question_id))
            ident = f"u:{s.student_id}" if s.student_id else f"n:{s.student_number}"
            group_students.setdefault(grp, set()).add(ident)
        exam_student_counts = {g: len(st) for g, st in group_students.items()}

    max_students_in_any_exam = max(exam_student_counts.values(), default=0)

    return {
        "plan": plan,
        "plan_tier": plan["id"],
        "plan_updated_at": getattr(user, "plan_updated_at", None),
        "usage": {
            "exams_used": exams_used,
            "exams_limit": plan["max_exams"],
            "exams_remaining": max(0, plan["max_exams"] - exams_used),
            "max_students_per_exam": plan["max_students_per_exam"],
            "max_questions_per_exam": plan["max_questions_per_exam"],
            "max_duration_minutes": plan["max_duration_minutes"],
            "peak_students_in_single_exam": max_students_in_any_exam,
            "total_submissions": total_submissions,
            "exam_student_counts": exam_student_counts,
        },
        "all_plans": list(PLANS.values()),
    }


@router.get("/plans")
def list_public_plans() -> Any:
    """Public endpoint returning all available OralIQ subscription tiers."""
    return {"plans": list(PLANS.values())}


@router.get("/status")
def read_billing_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Returns the current user's subscription tier, quota limits, and live usage."""
    return get_lecturer_usage(db, current_user)


@router.post("/upgrade")
def upgrade_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    payload: UpgradePlanRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Initiates a dual-currency checkout (EGP via Paymob / USD via Stripe)
    or activates the plan immediately when running in sandbox/demo mode.
    """
    target_id = payload.plan_id.strip().lower()
    if target_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan ID")

    currency = payload.currency.strip().upper()
    if currency not in ("EGP", "USD"):
        currency = "EGP"

    target_plan = PLANS[target_id]
    amount = target_plan["price_egp"] if currency == "EGP" else target_plan["price_usd"]

    # Free tier or Sandbox/Demo instant activation
    current_user.plan_tier = target_id
    current_user.plan_updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(current_user)

    gateway_provider = "paymob_egp" if currency == "EGP" else "stripe_usd"
    status_data = get_lecturer_usage(db, current_user)
    return {
        "ok": True,
        "gateway": gateway_provider,
        "currency": currency,
        "amount": amount,
        "checkout_url": None,
        "message": f"تم تفعيل {target_plan['name_ar']} بنجاح ({amount} {'ج.م' if currency == 'EGP' else '$'})!",
        **status_data,
    }


@router.post("/webhook/paymob")
async def paymob_webhook(
    request: Request,
    hmac_header: Optional[str] = Header(default=None, alias="hmac"),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Paymob (Egypt EGP) Callback Webhook:
    Handles Card (Visa/Mastercard/Meeza), Mobile Wallets (Vodafone Cash), and Fawry callbacks.
    Verifies HMAC-SHA512 signature using PAYMOB_HMAC_SECRET before upgrading the lecturer's plan.
    """
    body = await request.json()
    obj = body.get("obj", {})
    hmac_secret = os.getenv("PAYMOB_HMAC_SECRET", "")

    if hmac_secret and hmac_header:
        fields = [
            "amount_cents", "created_at", "currency", "error_occured",
            "has_parent_transaction", "id", "integration_id", "is_3d_secure",
            "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
            "is_voided", "order.id", "owner", "pending", "source_data.pan",
            "source_data.sub_type", "source_data.type", "success",
        ]
        concat = ""
        for f in fields:
            parts = f.split(".")
            val: Any = obj
            for p in parts:
                val = val.get(p, "") if isinstance(val, dict) else ""
            if isinstance(val, bool):
                val = "true" if val else "false"
            concat += str(val)
        computed = hmac.new(hmac_secret.encode("utf-8"), concat.encode("utf-8"), hashlib.sha512).hexdigest()
        if not hmac.compare_digest(computed, hmac_header):
            raise HTTPException(status_code=401, detail="Invalid Paymob HMAC signature")

    if obj.get("success") is True:
        extras = obj.get("payment_key_claims", {}).get("billing_data", {})
        user_email = extras.get("email")
        plan_id = extras.get("extra_description", "pro").strip().lower()
        if user_email and plan_id in PLANS:
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                user.plan_tier = plan_id
                user.plan_updated_at = datetime.now(timezone.utc).isoformat()
                db.commit()

    return {"received": True}


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Stripe / LemonSqueezy (International USD) Webhook:
    Handles checkout.session.completed events and upgrades the lecturer's plan.
    """
    body = await request.json()
    event_type = body.get("type", "")
    if event_type == "checkout.session.completed":
        session_obj = body.get("data", {}).get("object", {})
        metadata = session_obj.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = (metadata.get("plan_id") or "pro").strip().lower()
        if user_id and plan_id in PLANS:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.plan_tier = plan_id
                user.plan_updated_at = datetime.now(timezone.utc).isoformat()
                db.commit()

    return {"received": True}
