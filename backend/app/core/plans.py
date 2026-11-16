"""
Subscription Plans & Capacity Controls for OralIQ.

Launch pricing: Free 5 student attempts once; Basic 199 EGP / 150 attempts per
30-day cycle; Professional 599 EGP / 600 attempts. Each attempt starts one
student's exam, with up to two questions and TWO MINUTES TOTAL.
Enterprise is quoted separately, with an explicitly bounded attempt allowance.

Rules:
  - An "exam" = one question group (group_token). Questions inside it don't count separately.
  - Paid quotas reset every 30-day cycle; unused monthly exams do NOT roll over.
  - Add-on exam packs (bonus_exams) never expire and are consumed only after the monthly quota.
  - Student attempts are reserved on exam start, atomically with the timed sitting.
    Resuming that sitting is free; abandoning it or starting a retake does not refund it.
  - Concurrent seats are separate from the cumulative attempt allowance.
  - Plan IDs (free/pro/campus/enterprise) are kept stable for frontend & DB compatibility.
"""
from typing import Any, Dict, Optional

UNLIMITED = 0  # sentinel used for "no limit"

# Billing periods: length in days and price multiplier (term = 1 month free, year = 2 months free).
BILLING_PERIODS: Dict[str, Dict[str, Any]] = {
    "monthly": {"days": 30, "months": 1, "multiplier": 1, "name_ar": "شهري", "name_en": "Monthly"},
    "term": {"days": 120, "months": 4, "multiplier": 3, "name_ar": "ترم (4 شهور)", "name_en": "Term (4 months)"},
    "yearly": {"days": 365, "months": 12, "multiplier": 10, "name_ar": "سنوي", "name_en": "Yearly"},
}

CYCLE_DAYS = 30          # monthly quota cycle length
GRACE_DAYS = 3           # keep paid limits a few days after expiry before falling back to free
ADDON_EXAMS_PER_PACK = 10

PLANS: Dict[str, Dict[str, Any]] = {
    "free": {
        "id": "free",
        "name_ar": "الباقة المجانية",
        "name_en": "Free",
        "price_egp": 0,
        "price_usd": 0,
        "purchasable": False,
        "exams_reset": "lifetime",       # trial quota, never resets
        "max_exams": 5,
        "max_questions_per_exam": 2,
        "max_duration_minutes": 2,
        "max_exam_duration_minutes": 2,
        "max_student_attempts": 5,
        "max_students": 5,
        "max_students_per_exam": UNLIMITED,
        "assistant_seats": 0,
        "addon_price_egp": None,
        "addon_price_usd": None,
        "queue_priority": 3,
        "queue_label_ar": "طابور معالجة عادي",
        "queue_label_en": "Standard AI Queue",
    },
    "pro": {
        "id": "pro",
        "name_ar": "الباقة الأساسية",
        "name_en": "Basic",
        "price_egp": 199,
        "price_usd": 4,
        "purchasable": True,
        "exams_reset": "monthly",
        "max_exams": 15,
        "max_questions_per_exam": 2,
        "max_duration_minutes": 2,
        "max_exam_duration_minutes": 2,
        "max_student_attempts": 150,
        "max_students": 10,
        "max_students_per_exam": UNLIMITED,
        "assistant_seats": 0,
        "addon_price_egp": None,
        "addon_price_usd": None,
        "queue_priority": 2,
        "queue_label_ar": "أولوية معالجة سريعة",
        "queue_label_en": "Fast Priority AI Queue",
    },
    "campus": {
        "id": "campus",
        "name_ar": "الباقة الاحترافية",
        "name_en": "Professional",
        "price_egp": 599,
        "price_usd": 12,
        "purchasable": True,
        "exams_reset": "monthly",
        "max_exams": 30,
        "max_questions_per_exam": 2,
        "max_duration_minutes": 2,
        "max_exam_duration_minutes": 2,
        "max_student_attempts": 600,
        "max_students": 10,
        "max_students_per_exam": UNLIMITED,
        "assistant_seats": 3,
        "addon_price_egp": None,
        "addon_price_usd": None,
        "queue_priority": 1,
        "queue_label_ar": "أولوية قصوى (VIP)",
        "queue_label_en": "VIP AI Queue",
    },
    "enterprise": {
        "id": "enterprise",
        "name_ar": "باقة المؤسسات",
        "name_en": "Enterprise",
        "price_egp": None,               # per contract: ~30 EGP / student / term
        "price_usd": None,
        "min_students": 150,
        "purchasable": False,            # activated by admin after contract
        "exams_reset": "monthly",
        "max_exams": 200,                # default; overridden by user.custom_max_exams
        "max_questions_per_exam": 2,
        "max_duration_minutes": 2,
        "max_exam_duration_minutes": 2,
        "max_student_attempts": 500,
        "max_students": 10,              # the shared server launch ceiling still applies
        "max_students_per_exam": UNLIMITED,
        "assistant_seats": UNLIMITED,
        "addon_price_egp": None,
        "addon_price_usd": None,
        "queue_priority": 0,
        "queue_label_ar": "أولوية المؤسسات حسب السعة",
        "queue_label_en": "Enterprise queue priority",
    },
}


def get_plan(plan_tier: Optional[str]) -> Dict[str, Any]:
    key = (plan_tier or "free").strip().lower()
    return PLANS.get(key, PLANS["free"])


def plan_price(plan_id: str, period: str, currency: str) -> Optional[int]:
    """Total price for a plan & billing period (None if not purchasable)."""
    plan = PLANS.get(plan_id)
    per = BILLING_PERIODS.get(period)
    if not plan or not per or not plan.get("purchasable"):
        return None
    base = plan["price_egp"] if currency == "EGP" else plan["price_usd"]
    if base is None:
        return None
    return int(base * per["multiplier"])


def addon_price(plan_id: str, currency: str) -> Optional[int]:
    plan = PLANS.get(plan_id) or {}
    return plan.get("addon_price_egp") if currency == "EGP" else plan.get("addon_price_usd")


def public_plans() -> list:
    """Plans enriched with period prices for the pricing page."""
    out = []
    for p in PLANS.values():
        item = dict(p)
        item["period_prices"] = {
            period: {
                "EGP": plan_price(p["id"], period, "EGP"),
                "USD": plan_price(p["id"], period, "USD"),
            }
            for period in BILLING_PERIODS
        } if p.get("purchasable") else None
        out.append(item)
    return out
