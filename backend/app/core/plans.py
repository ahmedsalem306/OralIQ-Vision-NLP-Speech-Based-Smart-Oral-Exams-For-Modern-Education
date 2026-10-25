"""
Subscription Plans & Computing Capacity Controls for OralIQ.
- Teacher-friendly pricing & generous exam quotas:
  * Free:       0 EGP   | 5 Exams          | Unlimited Students | 10 Q/exam | 3 min | Standard Queue (3)
  * Pro:        199 EGP | 30 Exams/month   | Unlimited Students | 20 Q/exam | 5 min | Fast Queue (2)
  * Campus:     399 EGP | 100 Exams/month  | Unlimited Students | 35 Q/exam | 10 min| VIP Turbo Queue (1)
  * Enterprise: 699 EGP | Unlimited (9999) | Unlimited Students | 50 Q/exam | 15 min| Instant Queue (0)
- Zero limit on student count per exam (even on the Free plan, 100+ or 1000+ students can take any exam).
- Computing capacity is protected via PriorityGradingLimiter (priority queue) + question audio duration cap.
"""
from typing import Any, Dict

PLANS: Dict[str, Dict[str, Any]] = {
    "free": {
        "id": "free",
        "name_ar": "الباقة المجانية",
        "name_en": "Free Starter",
        "price_usd": 0,
        "price_egp": 0,
        "max_exams": 5,
        "max_questions_per_exam": 10,
        "max_students_per_exam": 0,  # 0 = Unlimited students
        "max_duration_minutes": 3,
        "queue_priority": 3,
        "queue_label_ar": "طابور معالجة قياسي (Standard)",
        "queue_label_en": "Standard AI Queue",
    },
    "pro": {
        "id": "pro",
        "name_ar": "باقة المدرس الأساسية",
        "name_en": "Teacher Plan",
        "price_usd": 4,
        "price_egp": 199,
        "max_exams": 30,
        "max_questions_per_exam": 20,
        "max_students_per_exam": 0,  # 0 = Unlimited students
        "max_duration_minutes": 5,
        "queue_priority": 2,
        "queue_label_ar": "أولوية معالجة سريعة (Fast Queue)",
        "queue_label_en": "Fast Priority AI Queue",
    },
    "campus": {
        "id": "campus",
        "name_ar": "باقة المحاضر والسناتر",
        "name_en": "Pro Lecturer & Centers",
        "price_usd": 8,
        "price_egp": 399,
        "max_exams": 100,
        "max_questions_per_exam": 35,
        "max_students_per_exam": 0,  # 0 = Unlimited students
        "max_duration_minutes": 10,
        "queue_priority": 1,
        "queue_label_ar": "أولوية قصوى وقت الذروة (VIP Turbo)",
        "queue_label_en": "VIP Turbo AI Queue",
    },
    "enterprise": {
        "id": "enterprise",
        "name_ar": "باقة بلا حدود (مدارس وجامعات)",
        "name_en": "Unlimited & Campus",
        "price_usd": 14,
        "price_egp": 699,
        "max_exams": 9999,
        "max_questions_per_exam": 50,
        "max_students_per_exam": 0,  # 0 = Unlimited students
        "max_duration_minutes": 15,
        "queue_priority": 0,
        "queue_label_ar": "معالجة فورية بلا حدود (Instant AI)",
        "queue_label_en": "Dedicated Instant AI Queue",
    },
}


def get_plan(plan_tier: str | None) -> Dict[str, Any]:
    key = (plan_tier or "free").strip().lower()
    return PLANS.get(key, PLANS["free"])
