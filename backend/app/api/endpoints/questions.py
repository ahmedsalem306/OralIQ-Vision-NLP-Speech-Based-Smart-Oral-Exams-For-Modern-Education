from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.core.plans import get_plan
from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionOut, QuestionPublicOut

router = APIRouter()


# ── GET all questions (lecturer sees only their own) ──────────────────────────
@router.get("/", response_model=List[QuestionOut])
def read_questions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role in ["lecturer", "hr", "admin"]:
        return db.query(Question).filter(Question.creator_id == current_user.id).all()
    return []


# ── POST create question (lecturer only — enforces subscription plan quota) ───
@router.post("/", response_model=QuestionOut)
def create_question(
    *,
    db: Session = Depends(deps.get_db),
    question_in: QuestionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Only lecturers can create questions")

    plan = get_plan(getattr(current_user, "plan_tier", "free"))

    # 1. Enforce max_duration_minutes per question for computing capacity
    if question_in.duration_minutes > plan["max_duration_minutes"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"الحد الأقصى لمدة السؤال في {plan['name_ar']} هو {plan['max_duration_minutes']} دقائق. "
                f"قم بترقية الباقة لزيادة مدة الإجابة الصوتية."
            ),
        )

    existing_questions = db.query(Question).filter(Question.creator_id == current_user.id).all()
    distinct_groups = {q.group_token or q.exam_token for q in existing_questions}

    # 2. Enforce max_exams or max_questions_per_exam
    if question_in.group_token:
        group_questions = [
            q for q in existing_questions if q.group_token == question_in.group_token
        ]
        # Verify group ownership if group already exists in DB
        any_in_group = (
            db.query(Question)
            .filter(Question.group_token == question_in.group_token)
            .first()
        )
        if any_in_group and any_in_group.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to add to this exam group")

        if question_in.group_token not in distinct_groups and len(distinct_groups) >= plan["max_exams"]:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"وصلت للحد الأقصى لعدد الامتحانات المسموح بها في {plan['name_ar']} "
                    f"({plan['max_exams']} امتحانات). قم بترقية باقتك لإنشاء امتحانات إضافية."
                ),
            )
        if len(group_questions) >= plan["max_questions_per_exam"]:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"وصلت للحد الأقصى لعدد الأسئلة داخل الامتحان الواحد في {plan['name_ar']} "
                    f"({plan['max_questions_per_exam']} أسئلة)."
                ),
            )
    else:
        # Creating a brand-new exam group
        if len(distinct_groups) >= plan["max_exams"]:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"وصلت للحد الأقصى لعدد الامتحانات المسموح بها في {plan['name_ar']} "
                    f"({plan['max_exams']} امتحانات). قم بترقية باقتك لإنشاء امتحانات إضافية."
                ),
            )

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
    db.flush()

    if question_in.group_token:
        question.group_token = question_in.group_token
        count = db.query(Question).filter(Question.group_token == question_in.group_token).count()
        question.order_index = count - 1
    else:
        question.group_token = question.exam_token
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


# ── GET by exam token (PUBLIC — sanitized: omits model_answer & keywords) ───
@router.get("/by-token/{token}", response_model=QuestionPublicOut)
def get_question_by_token(
    token: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    question = db.query(Question).filter(Question.exam_token == token).first()
    if not question:
        raise HTTPException(status_code=404, detail="Exam not found")
    return question


# ── GET all questions in a group (PUBLIC — sanitized: omits model_answer & keywords) ──
@router.get("/by-group/{group_token}", response_model=List[QuestionPublicOut])
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
