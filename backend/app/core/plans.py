"""
Subscription Plans & Computing Capacity Controls for OralIQ.
Defines the per-plan limits on:
- max_exams: Maximum distinct exam groups (group_token) a lecturer can create
- max_questions_per_exam: Maximum questions inside a single exam group
- max_students_per_exam: Maximum distinct students allowed to submit to a single exam
- max_duration_minutes: Maximum voice recording duration per question (bounds Whisper CPU time)
- queue_priority: Priority in the AI grading queue (0 = highest / Enterprise, 3 = lowest / Free)
"""
from typing import Any, Dict

PLANS: Dict[str, Dict[str, Any]] = {
    "free": {
        "id": "free",
        "name_ar": "الباقة التجريبية",
        "name_en": "Free Starter",
        "price_usd": 0,
        "price_egp": 0,
        "max_exams": 2,
        "max_questions_per_exam": 5,
        "max_students_per_exam": 15,
        "max_duration_minutes": 2,
        "queue_priority": 3,
        "queue_label_ar": "طابور معالجة قياسي (Standard)",
        "queue_label_en": "Standard AI Queue",
    },
    "pro": {
        "id": "pro",
        "name_ar": "باقة المحاضر المحترف",
        "name_en": "Pro Lecturer",
        "price_usd": 19,
        "price_egp": 900,
        "max_exams": 10,
        "max_questions_per_exam": 15,
        "max_students_per_exam": 80,
        "max_duration_minutes": 5,
        "queue_priority": 2,
        "queue_label_ar": "أولوية معالجة سريعة (Fast Queue)",
        "queue_label_en": "Fast Priority AI Queue",
    },
    "campus": {
        "id": "campus",
        "name_ar": "باقة الكليات والمدارس",
        "name_en": "Campus & Faculty",
        "price_usd": 59,
        "price_egp": 2800,
        "max_exams": 35,
        "max_questions_per_exam": 25,
        "max_students_per_exam": 300,
        "max_duration_minutes": 10,
        "queue_priority": 1,
        "queue_label_ar": "أولوية قصوى وقت الذروة (VIP Queue)",
        "queue_label_en": "VIP Express AI Queue",
    },
    "enterprise": {
        "id": "enterprise",
        "name_ar": "باقة الجامعات والمنصات (API)",
        "name_en": "Enterprise & LMS",
        "price_usd": 149,
        "price_egp": 7000,
        "max_exams": 150,
        "max_questions_per_exam": 50,
        "max_students_per_exam": 1500,
        "max_duration_minutes": 15,
        "queue_priority": 0,
        "queue_label_ar": "معالجة فورية مخصصة (Dedicated Instant)",
        "queue_label_en": "Dedicated Instant AI Queue",
    },
}


def get_plan(plan_tier: str | None) -> Dict[str, Any]:
    key = (plan_tier or "free").strip().lower()
    return PLANS.get(key, PLANS["free"])
