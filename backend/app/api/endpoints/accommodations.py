from datetime import datetime
import anyio
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.question import Question
from app.models.accommodation import BiometricPreference, ExamAccommodation
from app.services import accommodations, service_pause

router = APIRouter()


class PreferenceIn(BaseModel):
    mode: Literal["face", "covered"]


class ReviewIn(BaseModel):
    decision: Literal["approved", "rejected"]
    identity_checked: bool = False


def question_for(db, key):
    q = db.query(Question).filter((Question.group_token == key) | (Question.exam_token == key)).first()
    if not q:
        raise HTTPException(404, "Exam not found")
    service_pause.ensure_exam_available(db, q)
    return q


@router.put("/preference")
def preference(payload: PreferenceIn, db: Session = Depends(deps.get_db), user: User = Depends(deps.get_current_user)):
    if user.role != "student":
        raise HTTPException(403, "Students only")
    # A mode cannot be changed while an exam is in progress.
    from app.models.exam_sitting import ExamSitting
    if db.query(ExamSitting).filter_by(user_id=user.id, status="active").filter(ExamSitting.deadline_at > datetime.utcnow()).first():
        raise HTTPException(409, "Finish your active exam before changing verification mode")
    row = db.get(BiometricPreference, user.id)
    if row is None:
        row = BiometricPreference(user_id=user.id)
        db.add(row)
    row.mode, row.chosen_at = payload.mode, datetime.utcnow()
    db.commit()
    return {"mode": row.mode, "lecturer_approval_required": row.mode == "covered"}


@router.post("/requests/{token}")
def request_approval(token: str, db: Session = Depends(deps.get_db), user: User = Depends(deps.get_current_user)):
    if user.role != "student" or not accommodations.covered_face(db, user.id):
        raise HTTPException(403, "Select covered-face mode first")
    q = question_for(db, token)
    if not q.creator_id:
        raise HTTPException(422, "This exam has no lecturer to approve accommodations")
    key = q.group_token or q.exam_token
    row = db.query(ExamAccommodation).filter_by(user_id=user.id, exam_key=key).first()
    if row is None:
        row = ExamAccommodation(user_id=user.id, exam_key=key, lecturer_id=q.creator_id)
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            row = db.query(ExamAccommodation).filter_by(user_id=user.id, exam_key=key).one()
    return {"id": row.id, "status": row.status, "mode": "covered"}


@router.get("/requests")
def list_requests(db: Session = Depends(deps.get_db), user: User = Depends(deps.get_current_user)):
    if user.role not in ("lecturer", "hr", "admin"):
        raise HTTPException(403, "Lecturers only")
    service_pause.ensure_lecturer_active(db, user)
    query = db.query(ExamAccommodation, User).join(User, User.id == ExamAccommodation.user_id)
    if user.role != "admin":
        query = query.filter(ExamAccommodation.lecturer_id == user.id)
    return [{"id": row.id, "student_name": student.full_name, "exam_key": row.exam_key,
             "status": row.status, "label": "طالبة منتقبة — تحقق صوتي ومراجعة هوية بشرية"}
            for row, student in query.order_by(ExamAccommodation.requested_at.desc()).limit(200).all()]


@router.post("/requests/{request_id}/review")
def review(request_id: int, payload: ReviewIn, db: Session = Depends(deps.get_db), user: User = Depends(deps.get_current_user)):
    service_pause.ensure_lecturer_active(db, user)
    row = db.get(ExamAccommodation, request_id)
    if not row or user.role not in ("lecturer", "hr", "admin") or (user.role != "admin" and row.lecturer_id != user.id):
        raise HTTPException(404, "Request not found")
    q = question_for(db, row.exam_key)
    if user.role != "admin" and q.creator_id != user.id:
        raise HTTPException(404, "Request not found")
    if payload.decision == "approved" and not payload.identity_checked:
        raise HTTPException(422, "Confirm that you independently checked the student's identity")
    row.status, row.reviewed_at, row.reviewed_by = payload.decision, datetime.utcnow(), user.id
    db.commit()
    return {"id": row.id, "status": row.status}


@router.post("/eyes")
async def eyes(exam_token: str = Form(...), image: UploadFile = File(...),
               db: Session = Depends(deps.get_db), user: User = Depends(deps.get_current_user)):
    from app.core.biometric_capacity import run_biometric
    from app.core.uploads import read_upload_capped, MAX_IMAGE_BYTES
    from app.services import exam_sessions, eye_visibility
    def authorize():
        if user.role != "student" or not accommodations.covered_face(db, user.id):
            raise HTTPException(403, "Covered-face students only")
        q = question_for(db, exam_token)
        key = q.group_token or q.exam_token
        accommodations.require_approval(db, user.id, key)
        if not exam_sessions.active_sitting(db, user, key):
            raise HTTPException(403, "An active sitting is required")
    await anyio.to_thread.run_sync(authorize)
    content = await read_upload_capped(image, MAX_IMAGE_BYTES)
    try:
        return await run_biometric(eye_visibility.observe, content)
    except ValueError:
        raise HTTPException(422, "Invalid eye frame")
