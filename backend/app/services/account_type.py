"""Correct an unused account's signup choice without replacing its identity or history."""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models.exam_session import ExamSession
from app.models.user import User


def correction_blocker(db: Session, user: User) -> str | None:
    if user.role not in {"student", "lecturer"}:
        return "managed_account"
    if not user.email_verified:
        return "verify_email"
    # Never use a role switch to lose a billing relationship, paid allowance or usage counter.
    if (user.owner_id is not None or (user.plan_tier or "free") != "free"
            or user.plan_updated_at or user.plan_started_at or user.plan_expires_at
            or user.plan_period or user.cycle_started_at
            or any(getattr(user, field) for field in (
                "exams_created_count", "cycle_exams_used", "lifetime_attempts_started",
                "cycle_attempts_started", "bonus_exams", "custom_max_attempts",
                "custom_max_exams", "custom_max_students",
            ))):
        return "account_in_use"
    if db.query(User.id).filter(User.owner_id == user.id).first():
        return "account_in_use"
    # Keep this fail-closed when new user-linked activity tables are added. Verification tokens
    # and enrollment preferences belong to the identity, and are safe to preserve unchanged.
    for table in Base.metadata.sorted_tables:
        if table.name in {"users", "email_verification_tokens", "biometric_preferences"}:
            continue
        references = [column == user.id for column in table.columns
                      if any(fk.target_fullname == "users.id" for fk in column.foreign_keys)]
        if references and db.execute(select(table.c[0]).where(or_(*references)).limit(1)).first():
            return "account_in_use"
    # Legacy seats encode student ids as strings rather than a foreign key.
    if db.query(ExamSession.id).filter(ExamSession.student_key == f"u:{user.id}").first():
        return "account_in_use"
    return None
