"""UTC admission windows; closing does not cancel an already admitted sitting."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.user import User


def utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value else None


def iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value else None


def require_admission(question: Question, at: Optional[datetime] = None) -> None:
    at = at or datetime.utcnow()
    extra = {"opens_at": iso(question.opens_at), "closes_at": iso(question.closes_at)}
    if question.opens_at and at < question.opens_at:
        raise HTTPException(403, detail={"code": "EXAM_NOT_OPEN", "message": "الامتحان لسه ما فتحش.",
                                       "message_en": "This exam has not opened yet.", **extra})
    if question.closes_at and at >= question.closes_at:
        raise HTTPException(403, detail={"code": "EXAM_CLOSED", "message": "انتهى موعد بدء الامتحان.",
                                       "message_en": "This exam is closed to new attempts.", **extra})


def require_question_access(db: Session, question: Question, user: Optional[User]) -> None:
    # Creators may preview; admitted students may reload and continue after closing.
    if user and user.id == question.creator_id:
        return
    if user:
        from app.services.exam_sessions import active_sitting, exam_key_of
        if active_sitting(db, user, exam_key_of(question)) is not None:
            return
    require_admission(question)
