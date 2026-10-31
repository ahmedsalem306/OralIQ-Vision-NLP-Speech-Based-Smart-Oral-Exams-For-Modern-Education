"""
Billing, Subscription Plans & Dual-Currency Payment Endpoints for OralIQ.

  - EGP via Paymob (cards, Meeza, wallets, InstaPay, Fawry) — HMAC-verified callbacks.
  - USD via Stripe Checkout — Stripe-Signature verified webhooks.
  - Plans are activated ONLY after a verified payment (or in explicit sandbox mode / by an admin).
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.plans import ADDON_EXAMS_PER_PACK, BILLING_PERIODS, PLANS, addon_price, get_plan, plan_price, public_plans
from app.models.payment import Payment
from app.models.user import User
from app.services import billing_service as bs
from app.services import payment_gateways as gw

router = APIRouter()


class CheckoutRequest(BaseModel):
    kind: str = Field(default="plan", pattern="^(plan|addon)$")
    plan_id: Optional[str] = Field(default=None, max_length=32)
    period: str = Field(default="monthly", max_length=16)
    currency: str = Field(default="EGP", max_length=8)
    payment_method: str = Field(default="card", max_length=32)  # informational (Paymob shows all enabled methods)
    wallet_phone: Optional[str] = Field(default=None, max_length=24)


class TeamAddRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class AdminGrantRequest(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    plan_id: Optional[str] = None
    months: int = Field(default=1, ge=1, le=36)
    custom_max_exams: Optional[int] = Field(default=None, ge=0)
    custom_max_students: Optional[int] = Field(default=None, ge=0)
    bonus_exams: int = Field(default=0, ge=0, le=10000)
    amount: int = Field(default=0, ge=0)
    currency: str = Field(default="EGP", max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)


def _require_lecturer(user: User) -> None:
    if user.role not in bs.LECTURER_ROLES:
        raise HTTPException(status_code=403, detail="Lecturers only")


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")


# ── Public / status ───────────────────────────────────────────────────────────

@router.get("/plans")
def list_public_plans() -> Any:
    """Public endpoint returning all subscription tiers with period prices."""
    return {
        "plans": public_plans(),
        "periods": BILLING_PERIODS,
        "addon_exams_per_pack": ADDON_EXAMS_PER_PACK,
    }


@router.get("/status")
def read_billing_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Current subscription, limits, live usage and team."""
    return bs.billing_status(db, current_user)


# ── Checkout ──────────────────────────────────────────────────────────────────

def _start_checkout(db: Session, user: User, payload: CheckoutRequest) -> Any:
    _require_lecturer(user)
    account = bs.get_billing_account(db, user)
    if account.id != user.id:
        raise HTTPException(status_code=400, detail="حسابك تابع لاشتراك حساب آخر — صاحب الاشتراك هو اللي يدفع.")
    bs.refresh_account_state(db, account)

    currency = (payload.currency or "EGP").strip().upper()
    if currency not in ("EGP", "USD"):
        raise HTTPException(status_code=400, detail="Unsupported currency")

    if payload.kind == "addon":
        current_plan = get_plan(account.plan_tier)
        price = addon_price(current_plan["id"], currency)
        if price is None:
            raise HTTPException(status_code=400, detail="الامتحانات الإضافية متاحة للباقات المدفوعة (الأساسية والاحترافية) فقط.")
        payment = Payment(
            user_id=account.id, kind="addon", plan_id=current_plan["id"],
            addon_exams=ADDON_EXAMS_PER_PACK, amount=price, currency=currency,
        )
        description = f"OralIQ +{ADDON_EXAMS_PER_PACK} exams"
    else:
        plan_id = (payload.plan_id or "").strip().lower()
        period = (payload.period or "monthly").strip().lower()
        if plan_id not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid subscription plan ID")
        if period not in BILLING_PERIODS:
            raise HTTPException(status_code=400, detail="Invalid billing period")
        price = plan_price(plan_id, period, currency)
        if price is None:
            if plan_id == "enterprise":
                raise HTTPException(status_code=400, detail="باقة المؤسسات بالتعاقد — تواصل معنا وهنفعّلها لك.")
            raise HTTPException(status_code=400, detail="This plan cannot be purchased")
        payment = Payment(
            user_id=account.id, kind="plan", plan_id=plan_id, period=period,
            amount=price, currency=currency,
        )
        description = f"OralIQ {PLANS[plan_id]['name_en']} ({BILLING_PERIODS[period]['name_en']})"

    method = (payload.payment_method or "card").strip().lower()
    use_paymob = currency == "EGP" and gw.paymob_configured(method)
    use_stripe = currency == "USD" and gw.stripe_configured()

    if use_paymob or use_stripe:
        payment.provider = "paymob" if use_paymob else "stripe"
        db.add(payment)
        db.commit()
        db.refresh(payment)
        try:
            url = (gw.paymob_create_checkout if use_paymob else gw.stripe_create_checkout)(
                payment, account, description, payment_method=method, wallet_phone=payload.wallet_phone,
            )
        except gw.GatewayError as e:
            payment.status = "failed"
            payment.note = str(e)[:500]
            db.commit()
            raise HTTPException(status_code=502, detail="تعذر بدء عملية الدفع — حاول مرة أخرى.")
        db.commit()  # keeps the gateway order id recorded on the payment
        return {
            "ok": True,
            "gateway": payment.provider,
            "reference": payment.reference,
            "currency": currency,
            "amount": payment.amount,
            "checkout_url": url,
            "message": "جاري تحويلك لصفحة الدفع...",
        }

    if gw.sandbox_enabled():
        # Development only: simulate a successful payment.
        payment.provider = "sandbox"
        db.add(payment)
        db.commit()
        db.refresh(payment)
        bs.apply_paid_payment(db, payment, provider_txn_id=f"sandbox-{payment.id}")
        return {
            "ok": True,
            "gateway": "sandbox",
            "reference": payment.reference,
            "currency": currency,
            "amount": payment.amount,
            "checkout_url": None,
            "message": f"(وضع تجريبي) تم التفعيل بنجاح ({payment.amount} {'ج.م' if currency == 'EGP' else '$'})",
            **bs.billing_status(db, user),
        }

    raise HTTPException(status_code=503, detail="بوابة الدفع غير مفعّلة حالياً — تواصل مع الدعم.")


@router.post("/checkout")
def create_checkout(
    *,
    db: Session = Depends(deps.get_db),
    payload: CheckoutRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Start a checkout for a plan (monthly / term / yearly) or an add-on exam pack."""
    return _start_checkout(db, current_user, payload)


@router.post("/upgrade")
def upgrade_subscription_plan(
    *,
    db: Session = Depends(deps.get_db),
    payload: CheckoutRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Backward-compatible alias of /checkout (does NOT activate without payment)."""
    return _start_checkout(db, current_user, payload)


@router.get("/payments")
def list_my_payments(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    rows = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.id.desc()).limit(50).all()
    return [_payment_out(p) for p in rows]


@router.get("/payments/{reference}")
def get_payment(
    reference: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    p = db.query(Payment).filter(Payment.reference == reference, Payment.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _payment_out(p)


def _payment_out(p: Payment) -> dict:
    return {
        "reference": p.reference, "kind": p.kind, "plan_id": p.plan_id, "period": p.period,
        "addon_exams": p.addon_exams, "amount": p.amount, "currency": p.currency,
        "provider": p.provider, "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
    }


# ── Webhooks ──────────────────────────────────────────────────────────────────

def _fulfil(db: Session, reference: Optional[str], amount_minor: Optional[int], currency: Optional[str],
            success: bool, txn_id: Optional[str], expected_marker: Optional[str] = None) -> dict:
    if not reference:
        return {"received": True, "matched": False}
    payment = (
        db.query(Payment).filter(Payment.reference == str(reference)).with_for_update().first()
    )
    if not payment:
        return {"received": True, "matched": False}
    if expected_marker is not None and payment.status != "paid" and payment.provider_txn_id != expected_marker:
        # Signed callback for a different gateway order than the one this payment created.
        return {"received": True, "matched": False}
    if payment.status == "paid":
        return {"received": True, "matched": True, "already_applied": True}
    if not success:
        payment.status = "failed"
        if expected_marker is None:  # keep the Paymob order marker: the buyer may retry on the same order
            payment.provider_txn_id = str(txn_id)[:128] if txn_id else payment.provider_txn_id
        db.commit()
        return {"received": True, "matched": True, "status": "failed"}
    expected_minor = int(payment.amount) * 100
    if amount_minor is not None and int(amount_minor) != expected_minor:
        payment.status = "failed"
        payment.note = f"amount mismatch: got {amount_minor}, expected {expected_minor}"
        db.commit()
        return {"received": True, "matched": True, "status": "amount_mismatch"}
    if currency and currency.upper() != payment.currency.upper():
        payment.status = "failed"
        payment.note = f"currency mismatch: got {currency}"
        db.commit()
        return {"received": True, "matched": True, "status": "currency_mismatch"}
    bs.apply_paid_payment(db, payment, provider_txn_id=txn_id)
    return {"received": True, "matched": True, "status": "paid"}


@router.post("/webhook/paymob")
async def paymob_webhook(
    request: Request,
    hmac_query: Optional[str] = Query(default=None, alias="hmac"),
    hmac_header: Optional[str] = Header(default=None, alias="hmac"),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Paymob transaction-processed callback (HMAC-SHA512 verification is mandatory)."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    obj = body.get("obj", {}) if isinstance(body, dict) else {}
    if not gw.paymob_verify_hmac(obj, hmac_query or hmac_header):
        raise HTTPException(status_code=401, detail="Invalid Paymob HMAC signature")
    if obj.get("pending") is True:
        return {"received": True, "pending": True}
    return _fulfil(
        db,
        reference=gw.paymob_reference(obj),
        amount_minor=obj.get("amount_cents"),
        currency=obj.get("currency"),
        success=obj.get("success") is True,
        txn_id=obj.get("id"),
        expected_marker=gw.paymob_order_marker(gw._dig(obj, "order.id")),
    )


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature"),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Stripe webhook (Stripe-Signature verification is mandatory)."""
    raw = await request.body()
    if not gw.stripe_verify_signature(raw, stripe_signature):
        raise HTTPException(status_code=401, detail="Invalid Stripe signature")
    import json
    try:
        event = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    etype = event.get("type", "")
    session = event.get("data", {}).get("object", {})
    reference = session.get("client_reference_id") or (session.get("metadata") or {}).get("reference")
    if etype in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if session.get("payment_status") not in ("paid", "no_payment_required"):
            return {"received": True, "pending": True}
        return _fulfil(db, reference, session.get("amount_total"), session.get("currency"), True, session.get("id"))
    if etype in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        return _fulfil(db, reference, None, None, False, session.get("id"))
    return {"received": True, "ignored": etype}


# ── Team (assistant accounts) ─────────────────────────────────────────────────

@router.get("/team")
def list_team(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _require_lecturer(current_user)
    status = bs.billing_status(db, current_user)
    return {"team": status["team"], "assistant_seats": status["usage"]["assistant_seats"]}


@router.post("/team")
def add_team_member(
    *,
    db: Session = Depends(deps.get_db),
    payload: TeamAddRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Owner links an existing lecturer account as an assistant (shares the owner's quota)."""
    _require_lecturer(current_user)
    if current_user.owner_id:
        raise HTTPException(status_code=400, detail="حساب المساعد لا يمكنه إضافة مساعدين.")
    bs.refresh_account_state(db, current_user)
    seats = get_plan(current_user.plan_tier)["assistant_seats"]
    current_count = db.query(User).filter(User.owner_id == current_user.id).count()
    if get_plan(current_user.plan_tier)["id"] in ("free", "pro"):
        raise bs.QuotaExceeded(
            "ASSISTANTS_NOT_IN_PLAN",
            "حسابات المساعدين متاحة في الباقة الاحترافية والمؤسسات.",
            "Assistant accounts are available on Professional and Enterprise plans.",
        )
    if seats != 0 and current_count >= seats:
        raise bs.QuotaExceeded(
            "ASSISTANT_SEATS_FULL",
            f"وصلت للحد الأقصى من المساعدين ({seats}).",
            f"Assistant seats are full ({seats}).",
            limit=seats,
        )
    email_clean = payload.email.strip().lower()
    member = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not member:
        raise HTTPException(status_code=404, detail="لا يوجد حساب بهذا البريد — اطلب من المساعد يسجّل كمحاضر الأول.")
    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك إضافة نفسك.")
    if member.role not in bs.LECTURER_ROLES:
        raise HTTPException(status_code=400, detail="المساعد لازم يكون حساب محاضر/مدرس.")
    if member.owner_id and member.owner_id != current_user.id:
        raise HTTPException(status_code=400, detail="هذا الحساب تابع لفريق آخر بالفعل.")
    if db.query(User).filter(User.owner_id == member.id).count():
        raise HTTPException(status_code=400, detail="هذا الحساب لديه فريق خاص به.")
    member.owner_id = current_user.id
    db.commit()
    return {"ok": True, "member": {"id": member.id, "email": member.email, "full_name": member.full_name}}


@router.delete("/team/{member_id}")
def remove_team_member(
    member_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    member = db.query(User).filter(User.id == member_id).first()
    if not member or member.owner_id != current_user.id:
        # An assistant may also leave the team themselves.
        if not (member and member.id == current_user.id and member.owner_id):
            raise HTTPException(status_code=404, detail="Team member not found")
    member.owner_id = None
    db.commit()
    return {"ok": True}


# ── Admin (manual payments, enterprise contracts, bonus exams) ────────────────

@router.post("/admin/grant")
def admin_grant(
    *,
    db: Session = Depends(deps.get_db),
    payload: AdminGrantRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Admin: activate a plan after offline payment (InstaPay/transfer) or an enterprise contract."""
    _require_admin(current_user)
    q = db.query(User)
    target = q.filter(User.id == payload.user_id).first() if payload.user_id else (
        q.filter(func.lower(User.email) == (payload.email or "").strip().lower()).first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    bs.refresh_account_state(db, target)
    if payload.plan_id:
        plan_id = payload.plan_id.strip().lower()
        if plan_id not in PLANS or plan_id == "free":
            raise HTTPException(status_code=400, detail="Invalid plan")
        bs.grant_plan(target, plan_id, "monthly", months=payload.months)
    if payload.custom_max_exams is not None:
        target.custom_max_exams = payload.custom_max_exams
    if payload.custom_max_students is not None:
        target.custom_max_students = payload.custom_max_students
    if payload.bonus_exams:
        target.bonus_exams = int(target.bonus_exams or 0) + payload.bonus_exams

    db.add(Payment(
        user_id=target.id, kind="plan" if payload.plan_id else "addon",
        plan_id=(payload.plan_id or target.plan_tier), period=f"{payload.months}m",
        addon_exams=payload.bonus_exams, amount=payload.amount, currency=payload.currency.upper(),
        provider="manual", status="paid", paid_at=bs.utcnow(),
        note=f"granted by admin #{current_user.id}: {payload.note or ''}"[:500],
    ))
    db.commit()
    return {"ok": True, **bs.billing_status(db, target)}
