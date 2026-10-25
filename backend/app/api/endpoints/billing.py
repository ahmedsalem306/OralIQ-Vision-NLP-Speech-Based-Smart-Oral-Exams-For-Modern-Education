"""
Billing, Subscription Plans & Quota Status Endpoints for OralIQ.
"""
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.plans import PLANS, get_plan
from app.models.exam_submission import ExamSubmission
from app.models.question import Question
from app.models.user import User

router = APIRouter()


class UpgradePlanRequest(BaseModel):
    plan_id: str = Field(..., min_length=2, max_length=32)
    payment_method: str = Field(default="card", max_length=32)


def get_lecturer_usage(db: Session, user: User) -> Dict[str, Any]:
    plan = get_plan(getattr(user, "plan_tier", "free"))
    questions = db.query(Question).filter(Question.creator_id == user.id).all()
    distinct_groups = {q.group_token or q.exam_token for q in questions}
    exams_used = len(distinct_groups)

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
    """Upgrades or switches the lecturer's subscription tier."""
    target_id = payload.plan_id.strip().lower()
    if target_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan ID")

    current_user.plan_tier = target_id
    current_user.plan_updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(current_user)

    status_data = get_lecturer_usage(db, current_user)
    return {
        "ok": True,
        "message": f"تم تفعيل {PLANS[target_id]['name_ar']} بنجاح!",
        **status_data,
    }
