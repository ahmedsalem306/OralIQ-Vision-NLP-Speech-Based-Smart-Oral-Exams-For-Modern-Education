from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionOut

router = APIRouter()

# ── GET all questions (lecturer sees only their own) ──────────────────────────
@router.get("/", response_model=List[QuestionOut])
def read_questions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role in ["lecturer", "hr", "admin"]:
        return db.query(Question).filter(Question.creator_id == current_user.id).all()
    # Students see nothing here — they access via exam token
    return []

# ── POST create question (lecturer only) ──────────────────────────────────────
@router.post("/", response_model=QuestionOut)
def create_question(
    *,
    db: Session = Depends(deps.get_db),
    question_in: QuestionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Only lecturers can create questions")

    question = Question(
        text=question_in.text,
        model_answer=question_in.model_answer,
        keywords=question_in.keywords,
        difficulty=question_in.difficulty,
        category=question_in.category,
        duration_minutes=question_in.duration_minutes,
        creator_id=current_user.id,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

# ── DELETE question (only creator) ───────────────────────────────────────────
@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your question")
    db.delete(question)
    db.commit()

# ── GET by exam token (PUBLIC — no auth needed) ───────────────────────────────
@router.get("/by-token/{token}", response_model=QuestionOut)
def get_question_by_token(
    token: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    question = db.query(Question).filter(Question.exam_token == token).first()
    if not question:
        raise HTTPException(status_code=404, detail="Exam not found")
    return question
