from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import tempfile, os, json, traceback

from app.api import deps
from app.models.exam_submission import ExamSubmission
from app.models.exam_assignment import ExamAssignment
from app.models.question import Question
from app.models.user import User
from app.schemas.exam_submission import ExamSubmissionCreate, ExamSubmissionOut
from app.schemas.exam_assignment import ExamAssignmentCreate, AssignedExamOut

router = APIRouter()

# ── POST assign exam to student (lecturer) ────────────────────────────────────
@router.post("/assign")
def assign_exam(
    *,
    db: Session = Depends(deps.get_db),
    assignment_in: ExamAssignmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")

    question = db.query(Question).filter(Question.id == assignment_in.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    student = db.query(User).filter(User.id == assignment_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Avoid duplicate assignment
    existing = db.query(ExamAssignment).filter(
        ExamAssignment.question_id == assignment_in.question_id,
        ExamAssignment.student_id == assignment_in.student_id,
        ExamAssignment.status == "pending",
    ).first()
    if existing:
        return {"ok": True, "assignment_id": existing.id, "message": "Already assigned"}

    assignment = ExamAssignment(
        question_id=assignment_in.question_id,
        student_id=assignment_in.student_id,
        assigned_by=current_user.id,
        assigned_at=datetime.utcnow(),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"ok": True, "assignment_id": assignment.id}

# ── GET my assigned exams (student) ──────────────────────────────────────────
@router.get("/my-assignments", response_model=List[AssignedExamOut])
def get_my_assignments(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    assignments = db.query(ExamAssignment).filter(
        ExamAssignment.student_id == current_user.id,
        ExamAssignment.status == "pending",
    ).all()

    result = []
    for a in assignments:
        result.append(AssignedExamOut(
            id=a.id,
            question_id=a.question_id,
            assigned_at=a.assigned_at,
            status=a.status,
            question_text=a.question.text if a.question else None,
            question_category=a.question.category if a.question else None,
            question_difficulty=a.question.difficulty if a.question else None,
            exam_token=a.question.exam_token if a.question else None,
            assigned_by_name=a.lecturer.full_name if a.lecturer else "Unknown",
        ))
    return result

# ── GET all students (for lecturer to pick from) ──────────────────────────────
@router.get("/students", response_model=List[dict])
def get_students(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")
    students = db.query(User).filter(User.role == "student").all()
    return [{"id": s.id, "full_name": s.full_name, "email": s.email} for s in students]


# ── POST submit exam WITH audio + AI grading ──────────────────────────────────
@router.post("/submit", response_model=ExamSubmissionOut)
async def submit_exam(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    question_id: int = Form(...),
    student_name: str = Form(...),
    student_number: str = Form(...),
    audio: UploadFile = File(None),
    anti_cheat_alerts: str = Form("{}"),
    started_at: Optional[str] = Form(None),
    finished_at: Optional[str] = Form(None),
) -> Any:
    """
    Student submits exam — accepts audio file + anti-cheat alert JSON.
    Runs AI pipeline: Whisper transcribe → SBERT grade → cheat score.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Defaults
    transcript = None
    nlp_score = None
    speech_score = None
    facial_score = 100.0
    cheat_report = "✅ لم يتم رصد أي مخالفات"
    fluency_report = None

    # ---- AI Pipeline ----
    try:
        # 1) Transcribe + Fluency analysis with Whisper
        if audio and audio.filename:
            from app.services.speech_ai import speech_analyzer

            suffix = os.path.splitext(audio.filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await audio.read()
                tmp.write(content)
                tmp_path = tmp.name

            try:
                fluency = speech_analyzer.analyze_fluency(
                    tmp_path, hint=question.model_answer or ""
                )
                transcript = fluency["transcript"]
                speech_score = fluency["speech_score"]
                fluency_report = fluency["fluency_report"]
            finally:
                os.unlink(tmp_path)

        # 2) Grade answer with SBERT
        if transcript and question.model_answer:
            from app.services.nlp_ai import nlp_analyzer
            result = nlp_analyzer.evaluate_answer(transcript, question.model_answer)
            nlp_score = result["score"]

        # 3) Anti-cheat scoring
        try:
            alerts = json.loads(anti_cheat_alerts)
            if alerts:
                from app.services.face_ai import face_analyzer
                cheat_result = face_analyzer.calculate_cheat_score(alerts)
                facial_score = cheat_result["facial_score"]
                cheat_report = cheat_result["report"]
        except (json.JSONDecodeError, Exception):
            pass

    except Exception as e:
        print(f"[AI Pipeline Error] {traceback.format_exc()}")
        # Still save the submission even if AI fails

    # ---- Calculate overall score ----
    # 🆕 Weighted Logic: 80% Content (NLP) + 10% Delivery (Fluency) + 10% Integrity (Facial)
    if nlp_score is not None:
        fluency_val = speech_score if speech_score is not None else 50.0
        
        # Calculate raw score
        raw_overall = (nlp_score * 0.8) + (fluency_val * 0.1) + (facial_score * 0.1)
        
        # 🛡️ FAIL-FAST RULES:
        # 1. If you failed the content (NLP < 50), you cannot pass overall.
        # 2. 🚨 CHEATING PENALTY: If facial_score is very low (e.g. < 85), apply a massive penalty
        #    so they don't get a high grade just for answering correctly while cheating.
        
        if facial_score < 85: # Suspicious behavior detected
            # For every 1% below 85%, deduct 1.5% from the final grade
            penalty = (85 - facial_score) * 1.5
            raw_overall -= penalty
            
        if nlp_score < 50 or raw_overall < 50:
            overall = min(max(raw_overall, 0), 49.9) # Max 49.9 if failed
        else:
            overall = min(round(raw_overall, 1), 100.0)
    else:
        overall = None

    # ---- Save ----
    dt_started = None
    if started_at:
        try:
            dt_started = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            if dt_started.tzinfo is None:
                dt_started = dt_started.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    dt_finished = None
    if finished_at:
        try:
            dt_finished = datetime.fromisoformat(finished_at.replace('Z', '+00:00'))
            if dt_finished.tzinfo is None:
                dt_finished = dt_finished.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    if not dt_finished:
        dt_finished = datetime.now(timezone.utc)

    submission = ExamSubmission(
        question_id=question_id,
        student_id=current_user.id,
        student_name=student_name,
        student_number=student_number,
        transcript=transcript,
        nlp_score=nlp_score,
        speech_score=speech_score,
        facial_score=facial_score,
        overall_score=overall,
        cheat_report=cheat_report,
        fluency_report=fluency_report,
        started_at=dt_started,
        finished_at=dt_finished,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Mark assignment as completed
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.question_id == question_id,
        ExamAssignment.student_id == current_user.id,
        ExamAssignment.status == "pending",
    ).first()
    if assignment:
        assignment.status = "completed"
        db.commit()

    return submission

# ── GET results for a question (lecturer only) ────────────────────────────────
@router.get("/results/{question_id}", response_model=List[ExamSubmissionOut])
def get_results(
    question_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")
    question = db.query(Question).filter(
        Question.id == question_id,
        Question.creator_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question.submissions

# ── GET all results for all questions (lecturer dashboard) ────────────────────
@router.get("/all-results", response_model=List[ExamSubmissionOut])
def get_all_results(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")
    
    # Join Question to filter by creator
    submissions = db.query(ExamSubmission).join(Question).filter(
        Question.creator_id == current_user.id
    ).all()
    
    # Manually populate question details since Pydantic might not pick them from relationship automatically without alias
    result = []
    for s in submissions:
        # Create a dict or copy
        item = ExamSubmissionOut.from_orm(s)
        if s.question:
            item.question_text = s.question.text
            item.question_category = s.question.category
        result.append(item)

    return result

# ── GET attendance data (lecturer) ────────────────────────────────────────────
@router.get("/attendance", response_model=List[dict])
def get_attendance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")

    # Get all assignments for questions created by this lecturer
    assignments = db.query(ExamAssignment).join(Question).filter(
        Question.creator_id == current_user.id
    ).all()

    # Also get all submissions for questions created by this lecturer (in case they weren't explicitly assigned)
    submissions = db.query(ExamSubmission).join(Question).filter(
        Question.creator_id == current_user.id
    ).all()

    data_map = {} # student_id -> record

    # Process assignments first
    for a in assignments:
        key = (a.student_id, a.question_id)
        data_map[key] = {
            "id": a.id,
            "student_name": a.student.full_name if a.student else "Unknown",
            "email": a.student.email if a.student else "",
            "assigned_at": a.assigned_at,
            "started_at": None,
            "finished_at": None,
            "status": a.status,
            "score": None,
            "question_title": a.question.text[:50] if a.question and a.question.text else "Exam"
        }

    # Process submissions
    for s in submissions:
        key = (s.student_id, s.question_id)
        if key in data_map:
            data_map[key]["status"] = "completed"
            data_map[key]["score"] = s.overall_score
        else:
            # Student did the exam without an explicit assignment (e.g. via direct link)
            data_map[key] = {
                "id": -s.id, # Negative ID to distinguish
                "student_name": s.student_name or (s.student.full_name if s.student else "Unknown"),
                "email": s.student.email if s.student else "",
                "assigned_at": s.submitted_at, # Fallback to submission time if not assigned
                "started_at": s.started_at,
                "finished_at": s.submitted_at,
                "status": "completed",
                "score": s.overall_score,
                "question_title": s.question.text[:50] if s.question and s.question.text else "Exam"
            }
        
        # Populate timing if key in data_map
        if key in data_map and s.started_at:
            data_map[key]["started_at"] = s.started_at
            data_map[key]["finished_at"] = s.submitted_at

    return list(data_map.values())

# ── GET my grades (student — only visible ones) ───────────────────────────────
@router.get("/my-grades", response_model=List[ExamSubmissionOut])
def get_my_grades(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return db.query(ExamSubmission).filter(
        ExamSubmission.student_id == current_user.id,
        ExamSubmission.grade_visible == 1,
    ).all()

# ── PATCH toggle grade visibility (lecturer) ──────────────────────────────────
@router.patch("/submissions/{submission_id}/visibility")
def toggle_grade_visibility(
    submission_id: int,
    visible: bool,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")
    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.grade_visible = 1 if visible else 0
    db.commit()
    return {"ok": True}
