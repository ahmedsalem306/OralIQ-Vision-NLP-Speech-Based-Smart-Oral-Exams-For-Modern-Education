from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import tempfile, os, json, traceback
import numpy as np

from app.api import deps
from app.models.user import User
from app.services.voice_ai import voice_service

router = APIRouter()


def _has_voiceprint(user: User) -> bool:
    return bool(user.voice_embedding and len(user.voice_embedding) > 10)


def _can_enroll(user: User) -> bool:
    """First enrollment always allowed; re-enroll only if lecturer permitted."""
    if not _has_voiceprint(user):
        return True
    if not user.voice_locked:
        return True
    return bool(user.voice_reenroll_allowed)


@router.get("/status")
def get_voice_status(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Returns whether the current logged-in user has enrolled a voice print."""
    has_print = _has_voiceprint(current_user)
    status = voice_service.get_status()
    return {
        "has_voiceprint": has_print,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "engine": status["engine"],
        "engine_ready": status["ready"],
        "embedding_dim": status["embedding_dim"],
        "voice_locked": bool(current_user.voice_locked) if has_print else False,
        "voice_reenroll_allowed": bool(current_user.voice_reenroll_allowed),
        "can_reenroll": _can_enroll(current_user),
    }


@router.post("/enroll")
async def enroll_voice_print(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    audio: UploadFile = File(...),
) -> Any:
    """Enrolls a user's voice print from a single audio file (legacy support)."""
    if not _can_enroll(current_user):
        raise HTTPException(
            status_code=403,
            detail="بصمة الصوت مقفولة — اطلب من المحاضر السماح بإعادة التسجيل",
        )

    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required")

    suffix = os.path.splitext(audio.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        embedding = voice_service.extract_embedding(tmp_path)
        if not embedding or len(embedding) == 0:
            raise HTTPException(status_code=422, detail="Could not extract voice features from audio")

        current_user.voice_embedding = json.dumps(embedding)
        current_user.voice_locked = True
        current_user.voice_reenroll_allowed = False
        db.commit()
        db.refresh(current_user)

        return {
            "ok": True,
            "message": "تم تسجيل بصمة الصوت بنجاح!",
            "has_voiceprint": True,
            "voice_locked": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Voice Enroll Error] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to record voice print: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/enroll-multi")
async def enroll_voice_print_multi(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    audio_files: List[UploadFile] = File(...),
) -> Any:
    """
    Enrolls a user's voice print from multiple audio recordings.
    Extracts an embedding from each file, then averages them for a more robust
    voiceprint that captures different speaking patterns.
    """
    if not _can_enroll(current_user):
        raise HTTPException(
            status_code=403,
            detail="بصمة الصوت مقفولة — اطلب من المحاضر السماح بإعادة التسجيل",
        )

    if not audio_files or len(audio_files) == 0:
        raise HTTPException(status_code=400, detail="At least one audio file is required")

    embeddings: list[list[float]] = []
    tmp_paths: list[str] = []

    try:
        for i, audio in enumerate(audio_files):
            if not audio or not audio.filename:
                continue

            suffix = os.path.splitext(audio.filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await audio.read()
                tmp.write(content)
                tmp_paths.append(tmp.name)

            try:
                emb = voice_service.extract_embedding(tmp_paths[-1])
                if emb and len(emb) > 0:
                    embeddings.append(emb)
                    print(f"[Voice Enroll] Sample {i+1}/{len(audio_files)}: extracted {len(emb)}-dim embedding")
                else:
                    print(f"[Voice Enroll] Sample {i+1}: empty embedding, skipping")
            except Exception as e:
                print(f"[Voice Enroll] Sample {i+1} extraction error: {e}")

        if len(embeddings) == 0:
            raise HTTPException(status_code=422, detail="Could not extract voice features from any audio file")

        emb_array = np.array(embeddings, dtype=np.float32)
        avg_embedding = np.mean(emb_array, axis=0)
        norm = np.linalg.norm(avg_embedding)
        if norm > 0:
            avg_embedding = avg_embedding / norm

        final_embedding = avg_embedding.tolist()
        print(f"[Voice Enroll] Final embedding: {len(final_embedding)}-dim from {len(embeddings)} samples")

        current_user.voice_embedding = json.dumps(final_embedding)
        current_user.voice_locked = True
        current_user.voice_reenroll_allowed = False
        db.commit()
        db.refresh(current_user)

        return {
            "ok": True,
            "message": f"تم تسجيل بصمة الصوت بنجاح من {len(embeddings)} عينات!",
            "has_voiceprint": True,
            "samples_used": len(embeddings),
            "engine": voice_service.get_status()["engine"],
            "embedding_dim": len(final_embedding),
            "voice_locked": True,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Voice Enroll Multi Error] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to process voice samples: {str(e)}")
    finally:
        for p in tmp_paths:
            if os.path.exists(p):
                try:
                    os.unlink(p)
                except OSError:
                    pass


@router.delete("/enroll")
def delete_voice_print(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Resets voice print — only allowed when lecturer granted re-enroll permission."""
    if _has_voiceprint(current_user) and current_user.voice_locked and not current_user.voice_reenroll_allowed:
        raise HTTPException(
            status_code=403,
            detail="لا يمكن حذف البصمة — اطلب من المحاضر السماح بإعادة التسجيل",
        )
    current_user.voice_embedding = None
    current_user.voice_locked = False
    current_user.voice_reenroll_allowed = False
    db.commit()
    return {"ok": True, "message": "Voice print deleted"}


@router.post("/allow-reenroll/{student_id}")
def allow_voice_reenroll(
    student_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Lecturer temporarily allows a student to re-register their voiceprint."""
    if current_user.role not in ("lecturer", "hr", "admin"):
        raise HTTPException(status_code=403, detail="Lecturers only")

    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not _has_voiceprint(student):
        raise HTTPException(status_code=400, detail="Student has no voiceprint yet")

    student.voice_reenroll_allowed = True
    db.commit()
    return {
        "ok": True,
        "message": f"تم السماح لـ {student.full_name} بإعادة تسجيل بصمة الصوت",
        "student_id": student.id,
        "voice_reenroll_allowed": True,
    }


@router.post("/revoke-reenroll/{student_id}")
def revoke_voice_reenroll(
    student_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Lecturer revokes re-enroll permission before student uses it."""
    if current_user.role not in ("lecturer", "hr", "admin"):
        raise HTTPException(status_code=403, detail="Lecturers only")

    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.voice_reenroll_allowed = False
    db.commit()
    return {"ok": True, "message": "تم إلغاء السماح بإعادة التسجيل", "student_id": student.id}
