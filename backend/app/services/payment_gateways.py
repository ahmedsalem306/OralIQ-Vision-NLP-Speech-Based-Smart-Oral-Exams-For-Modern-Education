"""
Payment gateway adapters for OralIQ.

  * Paymob (EGP) — Accept 3-step API (auth → order → payment key) → iframe / wallet redirect.
    The order's merchant_order_id = our Payment.reference, so the callback maps to the exact payment.
    Callbacks are verified with HMAC-SHA512 (mandatory).
  * Stripe (USD) — Checkout Sessions via REST; webhooks verified with Stripe-Signature (mandatory).

Environment variables (same names as before, so existing secrets keep working):
  PAYMOB_API_KEY, PAYMOB_CARD_INTEGRATION_ID, PAYMOB_WALLET_INTEGRATION_ID, PAYMOB_IFRAME_ID, PAYMOB_HMAC_SECRET
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  FRONTEND_URL     — where the user returns after checkout
  BILLING_SANDBOX  — "1" to activate plans instantly without a gateway (defaults ON only when ENV=dev)
"""
import hashlib
import hmac
import os
import time
from typing import Any, Dict, Optional

import httpx

from app.models.payment import Payment
from app.models.user import User

PAYMOB_BASE = "https://accept.paymob.com"


class GatewayError(Exception):
    pass


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def sandbox_enabled() -> bool:
    raw = _env("BILLING_SANDBOX")
    if raw:
        return raw.lower() in ("1", "true", "yes", "on")
    # Never default to free activation on a deployed server (HF Space or a real Postgres DB).
    if _env("SPACE_ID") or _env("DATABASE_URL"):
        return False
    return _env("ENV", "dev") == "dev"


def frontend_url() -> str:
    return _env("FRONTEND_URL", "http://localhost:5173").rstrip("/")


# ── Paymob ────────────────────────────────────────────────────────────────────

PAYMOB_HMAC_FIELDS = [
    "amount_cents", "created_at", "currency", "error_occured",
    "has_parent_transaction", "id", "integration_id", "is_3d_secure",
    "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order.id", "owner", "pending", "source_data.pan",
    "source_data.sub_type", "source_data.type", "success",
]

WALLET_METHODS = ("wallet", "instapay", "vodafone_cash")


def paymob_configured(payment_method: str = "card") -> bool:
    if not _env("PAYMOB_API_KEY"):
        return False
    if payment_method in WALLET_METHODS:
        return bool(_env("PAYMOB_WALLET_INTEGRATION_ID"))
    return bool(_env("PAYMOB_CARD_INTEGRATION_ID") and _env("PAYMOB_IFRAME_ID"))


def _post(url: str, body: dict) -> dict:
    try:
        resp = httpx.post(url, json=body, timeout=15)
    except httpx.HTTPError as e:
        raise GatewayError(f"Paymob unreachable: {e}") from e
    if resp.status_code >= 300:
        raise GatewayError(f"Paymob error {resp.status_code} at {url}: {resp.text[:300]}")
    return resp.json()


def paymob_create_checkout(
    payment: Payment, user: User, description: str,
    payment_method: str = "card", wallet_phone: Optional[str] = None,
) -> str:
    is_wallet = payment_method in WALLET_METHODS
    if is_wallet and not wallet_phone:
        raise GatewayError("wallet phone required")
    integration_id = _env("PAYMOB_WALLET_INTEGRATION_ID" if is_wallet else "PAYMOB_CARD_INTEGRATION_ID")
    amount_cents = int(payment.amount) * 100

    token = _post(f"{PAYMOB_BASE}/api/auth/tokens", {"api_key": _env("PAYMOB_API_KEY")}).get("token")
    if not token:
        raise GatewayError("Paymob auth failed")

    order = _post(f"{PAYMOB_BASE}/api/ecommerce/orders", {
        "auth_token": token,
        "delivery_needed": "false",
        "amount_cents": str(amount_cents),
        "currency": "EGP",
        "merchant_order_id": payment.reference,
        "items": [{
            "name": description[:50], "amount_cents": str(amount_cents),
            "description": description, "quantity": "1",
        }],
    })
    order_id = order.get("id")
    if not order_id:
        raise GatewayError("Paymob order registration failed")
    # Remember Paymob's order id: the webhook matches on it because order.id is covered by the
    # HMAC, while merchant_order_id / extra_description are not (a signed callback could
    # otherwise be re-pointed at another pending payment). The caller commits.
    payment.provider_txn_id = paymob_order_marker(order_id)

    parts = (user.full_name or "OralIQ User").strip().split(" ", 1)
    pkey = _post(f"{PAYMOB_BASE}/api/acceptance/payment_keys", {
        "auth_token": token,
        "amount_cents": str(amount_cents),
        "expiration": 3600,
        "order_id": order_id,
        "billing_data": {
            "apartment": "NA", "floor": "NA", "street": "NA", "building": "NA",
            "shipping_method": "NA", "postal_code": "NA", "city": "Cairo", "state": "Cairo", "country": "EG",
            "email": user.email,
            "first_name": parts[0] or "OralIQ",
            "last_name": parts[1] if len(parts) > 1 else "User",
            "phone_number": wallet_phone or "+201000000000",
            "extra_description": payment.reference,
        },
        "currency": "EGP",
        "integration_id": int(integration_id),
    }).get("token")
    if not pkey:
        raise GatewayError("Paymob payment key failed")

    if is_wallet:
        pay = _post(f"{PAYMOB_BASE}/api/acceptance/payments/pay", {
            "source": {"identifier": wallet_phone, "subtype": "WALLET"},
            "payment_token": pkey,
        })
        url = pay.get("redirect_url") or pay.get("iframe_redirection_url")
        if not url:
            raise GatewayError("Paymob wallet redirect missing")
        return url

    return f"{PAYMOB_BASE}/api/acceptance/iframes/{_env('PAYMOB_IFRAME_ID')}?payment_token={pkey}"


def _dig(obj: Dict[str, Any], dotted: str) -> Any:
    val: Any = obj
    for part in dotted.split("."):
        val = val.get(part, "") if isinstance(val, dict) else ""
    return val


def paymob_verify_hmac(obj: Dict[str, Any], received: Optional[str]) -> bool:
    secret = _env("PAYMOB_HMAC_SECRET")
    if not secret or not received:
        return False  # never trust unsigned callbacks
    concat = ""
    for field in PAYMOB_HMAC_FIELDS:
        val = _dig(obj, field)
        if isinstance(val, bool):
            val = "true" if val else "false"
        concat += str(val)
    computed = hmac.new(secret.encode(), concat.encode(), hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, received.strip().lower())


def paymob_order_marker(order_id: Any) -> str:
    return f"paymob_order:{order_id}"


def paymob_reference(obj: Dict[str, Any]) -> Optional[str]:
    return (
        _dig(obj, "order.merchant_order_id")
        or _dig(obj, "payment_key_claims.billing_data.extra_description")
        or obj.get("special_reference")
        or None
    )


# ── Stripe ────────────────────────────────────────────────────────────────────

def stripe_configured() -> bool:
    return bool(_env("STRIPE_SECRET_KEY") and _env("STRIPE_WEBHOOK_SECRET"))


def stripe_create_checkout(payment: Payment, user: User, description: str, **_: Any) -> str:
    data = {
        "mode": "payment",
        "customer_email": user.email,
        "client_reference_id": payment.reference,
        "success_url": f"{frontend_url()}/dashboard?payment={payment.reference}",
        "cancel_url": f"{frontend_url()}/dashboard?payment={payment.reference}&canceled=1",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": str(int(payment.amount) * 100),
        "line_items[0][price_data][product_data][name]": description,
        "metadata[reference]": payment.reference,
    }
    try:
        resp = httpx.post(
            "https://api.stripe.com/v1/checkout/sessions",
            data=data,
            auth=(_env("STRIPE_SECRET_KEY"), ""),
            timeout=20,
        )
    except httpx.HTTPError as e:
        raise GatewayError(f"Stripe unreachable: {e}") from e
    if resp.status_code >= 300:
        raise GatewayError(f"Stripe session failed ({resp.status_code}): {resp.text[:300]}")
    url = resp.json().get("url")
    if not url:
        raise GatewayError("Stripe response missing checkout url")
    return url


def stripe_verify_signature(raw_body: bytes, sig_header: Optional[str], tolerance: int = 300) -> bool:
    secret = _env("STRIPE_WEBHOOK_SECRET")
    if not secret or not sig_header:
        return False
    parts: Dict[str, list] = {}
    for item in sig_header.split(","):
        if "=" in item:
            k, v = item.split("=", 1)
            parts.setdefault(k.strip(), []).append(v.strip())
    try:
        ts = int(parts.get("t", ["0"])[0])
    except ValueError:
        return False
    if abs(time.time() - ts) > tolerance:
        return False
    signed = f"{ts}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, sig) for sig in parts.get("v1", []))
