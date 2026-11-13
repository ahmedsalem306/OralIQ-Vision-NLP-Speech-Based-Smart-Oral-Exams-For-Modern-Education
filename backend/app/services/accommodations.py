from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.accommodation import BiometricPreference, ExamAccommodation


def covered_face(db: Session, user_id: int) -> bool:
    preference = db.get(BiometricPreference, user_id)
    return bool(preference and preference.mode == "covered")


def require_approval(db: Session, user_id: int, key: str):
    row = db.query(ExamAccommodation).filter_by(user_id=user_id, exam_key=key).first()
    if not row or row.status != "approved":
        raise HTTPException(status_code=403, detail={"code": "ACCOMMODATION_APPROVAL_REQUIRED",
            "message": "وضع النقاب يحتاج موافقة المحاضر على الهوية لهذا الامتحان قبل البدء.",
            "message_en": "Covered-face mode requires lecturer identity approval for this exam before starting."})
    return row
