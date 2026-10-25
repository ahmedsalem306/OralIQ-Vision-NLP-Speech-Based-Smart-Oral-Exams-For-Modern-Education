from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.core.plans import get_plan
from app.models.exam_assignment import ExamAssignment
from app.models.exam_submission import ExamSubmission
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
    cumulative_exams_used = max(getattr(current_user, "exams_created_count", 0) or 0, len(distinct_groups))

    # 2. Enforce max_exams or max_questions_per_exam & block exam-link recycling
    is_new_exam_group = False
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

        if question_in.group_token not in distinct_groups:
            is_new_exam_group = True
            if cumulative_exams_used >= plan["max_exams"]:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"وصلت للحد الأقصى لعدد الامتحانات المسموح بها في {plan['name_ar']} "
                        f"({plan['max_exams']} امتحانات). قم بترقية باقتك لإنشاء امتحانات إضافية."
                    ),
                )
        else:
            # Block adding/replacing questions inside an exam that already has student submissions,
            # assignments, or had questions deleted to recycle the link as a new exam.
            group_q_ids = [q.id for q in group_questions]
            max_prev_order = max(((q.order_index or 0) for q in group_questions), default=-1)
            had_deleted_questions = max_prev_order >= len(group_questions)
            if group_q_ids:
                has_submissions = (
                    db.query(ExamSubmission.id)
                    .filter(ExamSubmission.question_id.in_(group_q_ids))
                    .first()
                    is not None
                )
                has_assignments = (
                    db.query(ExamAssignment.id)
                    .filter(ExamAssignment.question_id.in_(group_q_ids))
                    .first()
                    is not None
                )
                if has_submissions or has_assignments or had_deleted_questions:
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            "لا يمكن استبدال أو إضافة أسئلة داخل امتحان تم تعديله أو مشاركته مع الطلاب "
                            "(لمنع إعادة استخدام نفس الرابط كامتحان جديد). يرجى الضغط على «امتحان جديد»."
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
        is_new_exam_group = True
        if cumulative_exams_used >= plan["max_exams"]:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"وصلت للحد الأقصى لعدد الامتحانات المسموح بها في {plan['name_ar']} "
                    f"({plan['max_exams']} امتحانات). قم بترقية باقتك لإنشاء امتحانات إضافية."
                ),
            )

    if is_new_exam_group:
        current_user.exams_created_count = cumulative_exams_used + 1

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


# ── DELETE question (only creator — does NOT refund consumed exam quota) ──────
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

    # Block deleting questions from an exam that already has student submissions
    # so lecturers cannot wipe questions and reuse the same exam link for a new exam.
    grp = question.group_token or question.exam_token
    grp_questions = db.query(Question).filter(Question.group_token == grp).all()
    grp_q_ids = [q.id for q in grp_questions] or [question.id]
    has_submissions = (
        db.query(ExamSubmission.id)
        .filter(ExamSubmission.question_id.in_(grp_q_ids))
        .first()
        is not None
    )
    if has_submissions:
        raise HTTPException(
            status_code=403,
            detail="لا يمكن حذف أو تعديل أسئلة امتحان قام الطلاب بالإجابة عليه بالفعل حفاظاً على سجل الدرجات ومنع إعادة استخدام الرابط.",
        )

    # Mark remaining questions in the group so deleted slots cannot be refilled to recycle the exam link
    remaining = [q for q in grp_questions if q.id != question.id]
    if remaining:
        max_idx = max((q.order_index or 0) for q in grp_questions)
        remaining[-1].order_index = max(max_idx, len(remaining))

    # Preserve cumulative count before deleting so deleting an exam NEVER refunds quota
    existing_questions = db.query(Question).filter(Question.creator_id == current_user.id).all()
    distinct_groups = {q.group_token or q.exam_token for q in existing_questions}
    current_user.exams_created_count = max(
        getattr(current_user, "exams_created_count", 0) or 0,
        len(distinct_groups),
    )

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
