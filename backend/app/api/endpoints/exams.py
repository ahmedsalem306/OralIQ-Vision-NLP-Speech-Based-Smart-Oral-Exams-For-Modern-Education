import asyncio
from contextlib import asynccontextmanager
import heapq
from typing import Any, Dict, List, Optional
import anyio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
import tempfile, os, json, traceback

from app.api import deps
from app.core.uploads import MAX_AUDIO_BYTES, read_upload_capped
from app.core.plans import get_plan
from app.services import billing_service as bs
from app.models.exam_submission import ExamSubmission
from app.models.exam_assignment import ExamAssignment
from app.models.question import Question
from app.models.user import User
from app.schemas.exam_submission import ExamSubmissionCreate, ExamSubmissionOut
from app.schemas.exam_assignment import ExamAssignmentCreate, AssignedExamOut

router = APIRouter()

ALLOWED_AUDIO_EXTS = {".webm", ".wav", ".mp3", ".ogg", ".m4a", ".mp4"}


def _safe_audio_suffix(filename: Optional[str]) -> str:
    if not filename:
        return ".webm"
    raw_ext = os.path.splitext(os.path.basename(filename))[1].lower()
    return raw_ext if raw_ext in ALLOWED_AUDIO_EXTS else ".webm"


# ── Priority AI Grading Concurrency Queue ─────────────────────────────────────
def _grading_slots() -> int:
    explicit = os.environ.get("MAX_CONCURRENT_GRADING", "").strip()
    if explicit.isdigit() and int(explicit) > 0:
        return int(explicit)
    return max(1, (os.cpu_count() or 2) // 4)


class PriorityGradingLimiter:
    """
    Priority-aware concurrency limiter for AI grading (Whisper + SBERT + Biometrics).
    Paid tiers (Enterprise=0, Campus=1, Pro=2) jump ahead of Free (3) when slots are full.
    """
    def __init__(self, max_slots: int):
        self.max_slots = max_slots
        self.active = 0
        self._seq = 0
        self._waiters: list[tuple[int, int, asyncio.Future]] = []

    @asynccontextmanager
    async def slot(self, priority: int = 3):
        loop = asyncio.get_running_loop()
        if self.active < self.max_slots and not self._waiters:
            self.active += 1
        else:
            fut = loop.create_future()
            self._seq += 1
            heapq.heappush(self._waiters, (priority, self._seq, fut))
            await fut
        try:
            yield
        finally:
            while self._waiters:
                _, _, next_fut = heapq.heappop(self._waiters)
                if not next_fut.done():
                    next_fut.set_result(True)
                    break
            else:
                self.active -= 1


GRADING_SLOTS = _grading_slots()
_priority_grading_limiter = PriorityGradingLimiter(GRADING_SLOTS)


def _run_ai_pipeline(
    audio_path: Optional[str],
    model_answer: str,
    keywords: str,
    anti_cheat_alerts: str,
    voice_embedding: Optional[str],
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "transcript": None,
        "nlp_score": None,
        "speech_score": None,
        "voice_score": None,
        "facial_score": 100.0,
        "cheat_report": None,
        "fluency_report": None,
    }

    try:
        if audio_path:
            from app.services.speech_ai import speech_analyzer
            from app.services.voice_ai import voice_service

            fluency = speech_analyzer.analyze_fluency(audio_path, hint=model_answer or "")
            out["transcript"] = fluency["transcript"]
            out["speech_score"] = fluency["speech_score"]
            out["fluency_report"] = fluency["fluency_report"]

            if voice_embedding:
                try:
                    stored_emb = json.loads(voice_embedding)
                    voice_res = voice_service.verify_voice(audio_path, stored_emb, threshold=0.75)
                    out["voice_score"] = voice_res["similarity_score"]
                except Exception as ve:
                    print(f"[Voice Verify Error] {ve}")

        if out["transcript"] and model_answer:
            from app.services.nlp_ai import nlp_analyzer
            result = nlp_analyzer.evaluate_answer(out["transcript"], model_answer, keywords or "")
            out["nlp_score"] = result["score"]

        try:
            alerts = json.loads(anti_cheat_alerts)
            if alerts and isinstance(alerts, dict):
                from app.services.face_ai import face_analyzer
                cheat_result = face_analyzer.calculate_cheat_score(alerts)
                out["facial_score"] = cheat_result["facial_score"]
                out["cheat_report"] = cheat_result.get("report")
        except (json.JSONDecodeError, Exception) as cheat_err:
            print(f"[Anti-cheat Error] {cheat_err}")

    except Exception:
        print(f"[AI Pipeline Error] {traceback.format_exc()}")

    return out


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
    if question.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to assign this question")

    student = db.query(User).filter(User.id == assignment_in.student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

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
    assignments = (
        db.query(ExamAssignment)
        .options(joinedload(ExamAssignment.question), joinedload(ExamAssignment.lecturer))
        .filter(
            ExamAssignment.student_id == current_user.id,
            ExamAssignment.status == "pending",
        )
        .all()
    )

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
    query = db.query(User).filter(User.role == "student")
    if current_user.role != "admin":
        # Only students linked to this lecturer's own questions (submitted or assigned) —
        # never the whole platform's student list (anyone can sign up as a lecturer).
        own_q = db.query(Question.id).filter(Question.creator_id == current_user.id)
        submitted = db.query(ExamSubmission.student_id).filter(ExamSubmission.question_id.in_(own_q))
        assigned = db.query(ExamAssignment.student_id).filter(ExamAssignment.question_id.in_(own_q))
        query = query.filter(or_(User.id.in_(submitted), User.id.in_(assigned)))
    students = query.order_by(User.id.desc()).limit(2000).all()
    return [{
        "id": s.id,
        "full_name": s.full_name,
        "email": s.email,
        "has_voiceprint": bool(s.voice_embedding and len(s.voice_embedding) > 10),
        "has_faceprint": bool(s.face_embedding and len(s.face_embedding) > 10),
        "voice_locked": bool(s.voice_locked),
        "face_locked": bool(s.face_locked),
        "voice_reenroll_allowed": bool(s.voice_reenroll_allowed),
    } for s in students]


# ── GET pre-exam access check (student) ──────────────────────────────────────
# Call before the student starts recording so a full student quota is reported up-front.
@router.get("/access-check/{group_token}")
def exam_access_check(
    group_token: str,
    student_number: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    question = (
        db.query(Question)
        .filter((Question.group_token == group_token) | (Question.exam_token == group_token))
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Exam not found")
    creator = db.query(User).filter(User.id == question.creator_id).first() if question.creator_id else None
    if creator is None:
        return {"allowed": True}
    account = bs.get_billing_account(db, creator)
    bs.refresh_account_state(db, account)
    bs.check_student_allowed(db, account, current_user.id, student_number)
    return {"allowed": True}


# ── POST submit exam WITH audio + AI grading + Plan Capacity & Priority Queue ──
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
    face_score: Optional[float] = Form(None),
    started_at: Optional[str] = Form(None),
    finished_at: Optional[str] = Form(None),
    submission_key: Optional[str] = Form(None),
) -> Any:
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    key = (submission_key or "").strip()[:128] or None
    if key:
        existing = db.query(ExamSubmission).filter(ExamSubmission.submission_key == key).first()
        if existing:
            if existing.student_id != current_user.id:
                raise HTTPException(status_code=409, detail="Duplicate submission key")
            return existing


    # Lecturer's billing account: distinct-student limit + priority AI grading queue.
    # Checked BEFORE the expensive AI pipeline runs.
    creator = db.query(User).filter(User.id == question.creator_id).first() if question.creator_id else None
    account = bs.get_billing_account(db, creator) if creator else None
    if account is not None:
        bs.refresh_account_state(db, account)
        bs.check_student_allowed(db, account, current_user.id, student_number)
    plan = get_plan(account.plan_tier if account is not None else "free")
    priority = int(plan.get("queue_priority", 3))

    face_id_score = max(0.0, min(100.0, float(face_score))) if face_score is not None else None
    student_name = (student_name or "").strip()[:120]
    student_number = (student_number or "").strip()[:64]
    if len(anti_cheat_alerts or "") > 32768:
        anti_cheat_alerts = "{}"
    overall = None

    tmp_path = None
    if audio and audio.filename:
        suffix = _safe_audio_suffix(audio.filename)
        content = await read_upload_capped(audio, MAX_AUDIO_BYTES)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

    try:
        async with _priority_grading_limiter.slot(priority=priority):
            ai = await anyio.to_thread.run_sync(
                _run_ai_pipeline,
                tmp_path,
                question.model_answer or "",
                question.keywords or "",
                anti_cheat_alerts,
                current_user.voice_embedding,
            )
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    transcript = ai["transcript"]
    nlp_score = ai["nlp_score"]
    speech_score = ai["speech_score"]
    voice_score = ai["voice_score"]
    facial_score = ai["facial_score"]
    cheat_report = ai["cheat_report"]
    fluency_report = ai["fluency_report"]

    face_verified = face_id_score is not None and face_id_score >= 55
    voice_verified = voice_score is not None and voice_score >= 75
    if current_user.face_embedding and face_id_score is not None:
        if face_verified and voice_verified:
            identity_msg = (
                f"✅ Identity verified: Face {face_id_score:.1f}% + Voice {voice_score:.1f}%"
            )
        else:
            identity_msg = (
                f"🚨 IDENTITY NOT VERIFIED: Face {face_id_score:.1f}% "
                f"(required 55%) + Voice {(voice_score or 0):.1f}% (required 75%)"
            )
        cheat_report = (
            (cheat_report + " | " + identity_msg) if cheat_report else identity_msg
        )

    if nlp_score is not None:
        fluency_val = speech_score if speech_score is not None else 50.0
        raw_overall = (nlp_score * 0.8) + (fluency_val * 0.1) + (facial_score * 0.1)

        if facial_score < 60:
            penalty = (60 - facial_score) * 0.75
            raw_overall -= penalty

        if nlp_score < 50 or raw_overall < 50:
            overall = min(max(raw_overall, 0), 49.9)
        else:
            overall = min(round(raw_overall, 1), 100.0)
    else:
        overall = None

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
        submission_key=key,
        student_name=student_name,
        student_number=student_number,
        transcript=transcript,
        nlp_score=nlp_score,
        speech_score=speech_score,
        voice_score=voice_score,
        face_score=face_id_score,
        facial_score=facial_score,
        overall_score=overall,
        cheat_report=cheat_report,
        fluency_report=fluency_report,
        started_at=dt_started,
        finished_at=dt_finished,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        winner = db.query(ExamSubmission).filter(ExamSubmission.submission_key == key).first()
        if winner and winner.student_id == current_user.id:
            return winner
        if winner:
            raise HTTPException(status_code=409, detail="Duplicate submission key")
        raise
    db.refresh(submission)

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
        Question.creator_id == current_user.id,
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

    submissions = (
        db.query(ExamSubmission)
        .options(joinedload(ExamSubmission.question))
        .join(Question)
        .filter(Question.creator_id == current_user.id)
        .all()
    )

    result = []
    for s in submissions:
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

    assignments = (
        db.query(ExamAssignment)
        .options(joinedload(ExamAssignment.student), joinedload(ExamAssignment.question))
        .join(Question)
        .filter(Question.creator_id == current_user.id)
        .all()
    )

    submissions = (
        db.query(ExamSubmission)
        .options(joinedload(ExamSubmission.student), joinedload(ExamSubmission.question))
        .join(Question)
        .filter(Question.creator_id == current_user.id)
        .all()
    )

    data_map = {}

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
            "question_title": a.question.text[:50] if a.question and a.question.text else "Exam",
        }

    for s in submissions:
        key = (s.student_id, s.question_id)
        if key in data_map:
            data_map[key]["status"] = "completed"
            data_map[key]["score"] = s.overall_score
        else:
            data_map[key] = {
                "id": -s.id,
                "student_name": s.student_name or (s.student.full_name if s.student else "Unknown"),
                "email": s.student.email if s.student else "",
                "assigned_at": s.submitted_at,
                "started_at": s.started_at,
                "finished_at": s.submitted_at,
                "status": "completed",
                "score": s.overall_score,
                "question_title": s.question.text[:50] if s.question and s.question.text else "Exam",
            }

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
    subs = (
        db.query(ExamSubmission)
        .options(joinedload(ExamSubmission.question).joinedload(Question.creator))
        .filter(
            ExamSubmission.student_id == current_user.id,
            ExamSubmission.grade_visible == 1,
        )
        .all()
    )
    out = []
    for s in subs:
        item = ExamSubmissionOut.model_validate(s)
        if s.question:
            item.question_text = s.question.text
            item.question_category = s.question.category
            if s.question.creator:
                item.lecturer_name = s.question.creator.full_name
        out.append(item)
    return out


# ── PATCH toggle grade visibility (lecturer — verified ownership) ─────────────
@router.patch("/submissions/{submission_id}/visibility")
def toggle_grade_visibility(
    submission_id: int,
    visible: bool,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["lecturer", "hr", "admin"]:
        raise HTTPException(status_code=403, detail="Lecturers only")
    sub = (
        db.query(ExamSubmission)
        .options(joinedload(ExamSubmission.question))
        .filter(ExamSubmission.id == submission_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if current_user.role != "admin" and (not sub.question or sub.question.creator_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this submission")
    sub.grade_visible = 1 if visible else 0
    db.commit()
    return {"ok": True}
