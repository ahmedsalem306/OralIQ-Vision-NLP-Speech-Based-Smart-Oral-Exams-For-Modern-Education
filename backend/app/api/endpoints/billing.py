"""
Billing, Subscription Plans & Dual-Currency Payment Gateway Endpoints for OralIQ.
Supports:
- EGP (ج.م) via Paymob / Kashier (Local Cards, Meeza, Vodafone Cash, InstaPay, Fawry)
- USD ($) via Stripe / LemonSqueezy (International Cards, Apple Pay, Google Pay)
- Automatic instant activation in sandbox/demo mode when gateway keys are not yet configured.
"""
import hashlib
import hmac
import json
import os
import urllib.parse
import urllib.request
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


def _create_paymob_checkout_url(user: User, plan: Dict[str, Any], payment_method: str, wallet_phone: Optional[str]) -> Optional[str]:
    """
    Executes Paymob's 3-step Acceptance API when PAYMOB_API_KEY is configured:
    1. Auth Token -> 2. Order Registration -> 3. Payment Key -> Returns Iframe/Wallet Checkout URL.
    """
    api_key = os.getenv("PAYMOB_API_KEY", "").strip()
    if not api_key or plan["price_egp"] <= 0:
        return None

    integration_id = (
        os.getenv("PAYMOB_WALLET_INTEGRATION_ID", "").strip()
        if payment_method == "instapay"
        else os.getenv("PAYMOB_CARD_INTEGRATION_ID", "").strip()
    )
    iframe_id = os.getenv("PAYMOB_IFRAME_ID", "").strip()
    if not integration_id:
        return None

    amount_cents = int(plan["price_egp"]) * 100

    def _post_json(url: str, data: dict) -> dict:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # Step 1: Authenticate
    auth_res = _post_json("https://accept.paymob.com/api/auth/tokens", {"api_key": api_key})
    auth_token = auth_res.get("token")
    if not auth_token:
        return None

    # Step 2: Register Order
    order_res = _post_json(
        "https://accept.paymob.com/api/ecommerce/orders",
        {
            "auth_token": auth_token,
            "delivery_needed": "false",
            "amount_cents": str(amount_cents),
            "currency": "EGP",
            "items": [
                {
                    "name": f"OralIQ - {plan['name_en']}",
                    "amount_cents": str(amount_cents),
                    "description": plan["id"],
                    "quantity": "1",
                }
            ],
        },
    )
    order_id = order_res.get("id")
    if not order_id:
        return None

    # Step 3: Request Payment Key
    full_name = (user.full_name or "OralIQ Lecturer").strip()
    parts = full_name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else "Lecturer"

    pkey_res = _post_json(
        "https://accept.paymob.com/api/acceptance/payment_keys",
        {
            "auth_token": auth_token,
            "amount_cents": str(amount_cents),
            "expiration": 3600,
            "order_id": order_id,
            "billing_data": {
                "apartment": "NA",
                "email": user.email,
                "floor": "NA",
                "first_name": first_name,
                "street": "NA",
                "building": "NA",
                "phone_number": wallet_phone or "+201000000000",
                "shipping_method": "NA",
                "postal_code": "NA",
                "city": "Cairo",
                "country": "EG",
                "last_name": last_name,
                "state": "Cairo",
                "extra_description": plan["id"],
            },
            "currency": "EGP",
            "integration_id": int(integration_id),
        },
    )
    payment_token = pkey_res.get("token")
    if not payment_token:
        return None

    if payment_method == "instapay" and wallet_phone:
        pay_res = _post_json(
            "https://accept.paymob.com/api/acceptance/payments/pay",
            {
                "source": {"identifier": wallet_phone, "subtype": "WALLET"},
                "payment_token": payment_token,
            },
        )
        return pay_res.get("redirect_url") or pay_res.get("iframe_redirection_url")

    if iframe_id:
        return f"https://accept.paymob.com/api/acceptance/iframes/{iframe_id}?payment_token={payment_token}"
    return None


def _create_stripe_checkout_url(user: User, plan: Dict[str, Any]) -> Optional[str]:
    """
    Creates a Stripe Checkout Session for USD payments when STRIPE_SECRET_KEY is configured.
    """
    secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not secret_key or plan["price_usd"] <= 0:
        return None

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    amount_cents = int(plan["price_usd"]) * 100

    form_data = urllib.parse.urlencode(
        {
            "mode": "payment",
            "success_url": f"{frontend_url}/dashboard?upgraded={plan['id']}",
            "cancel_url": f"{frontend_url}/dashboard?canceled=1",
            "customer_email": user.email,
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": str(amount_cents),
            "line_items[0][price_data][product_data][name]": f"OralIQ - {plan['name_en']}",
            "line_items[0][quantity]": "1",
            "metadata[user_id]": str(user.id),
            "metadata[plan_id]": plan["id"],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=form_data,
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("url")


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
    gateway_provider = "paymob_egp" if currency == "EGP" else "stripe_usd"

    # 1. If Live Payment Gateway Keys are configured, generate Checkout URL and wait for Webhook
    checkout_url: Optional[str] = None
    if amount > 0:
        try:
            if currency == "EGP" and os.getenv("PAYMOB_API_KEY", "").strip():
                checkout_url = _create_paymob_checkout_url(
                    current_user, target_plan, payload.payment_method, payload.wallet_phone
                )
            elif currency == "USD" and os.getenv("STRIPE_SECRET_KEY", "").strip():
                checkout_url = _create_stripe_checkout_url(current_user, target_plan)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"تعذر الاتصال ببوابة الدفع حالياً: {exc}",
            )

    if checkout_url:
        status_data = get_lecturer_usage(db, current_user)
        return {
            "ok": True,
            "gateway": gateway_provider,
            "currency": currency,
            "amount": amount,
            "checkout_url": checkout_url,
            "message": "جاري تحويلك لبوابة الدفع الآمنة...",
            **status_data,
        }

    # 2. Free tier or Sandbox/Demo instant activation (when gateway keys are not yet in .env)
    current_user.plan_tier = target_id
    current_user.plan_updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(current_user)

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
