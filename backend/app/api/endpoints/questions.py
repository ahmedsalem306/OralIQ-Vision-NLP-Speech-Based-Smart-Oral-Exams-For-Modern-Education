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
    db.flush()  # get the exam_token auto-generated

    # If group_token provided → add to existing group, else start new group
    if question_in.group_token:
        question.group_token = question_in.group_token
        # Set order_index based on existing questions in the group
        count = db.query(Question).filter(Question.group_token == question_in.group_token).count()
        question.order_index = count - 1  # this question was already flushed
    else:
        question.group_token = question.exam_token  # first question = group leader
        question.order_index = 0

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

# ── GET all questions in a group (PUBLIC) ──────────────────────────────────────
@router.get("/by-group/{group_token}", response_model=List[QuestionOut])
def get_questions_by_group(
    group_token: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    questions = (
        db.query(Question)
        .filter(Question.group_token == group_token)
        .order_by(Question.order_index)
        .all()
    )
    if not questions:
        raise HTTPException(status_code=404, detail="Exam group not found")
    return questions
