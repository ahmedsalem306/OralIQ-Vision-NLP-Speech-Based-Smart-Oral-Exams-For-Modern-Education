from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import tempfile, os, json, traceback
import numpy as np

from app.api import deps
from app.models.user import User
from app.services.voice_ai import voice_service

router = APIRouter()

@router.get("/status")
def get_voice_status(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Returns whether the current logged-in user has enrolled a voice print."""
    has_print = bool(current_user.voice_embedding and len(current_user.voice_embedding) > 10)
    status = voice_service.get_status()
    return {
        "has_voiceprint": has_print,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "engine": status["engine"],
        "engine_ready": status["ready"],
        "embedding_dim": status["embedding_dim"],
    }

@router.post("/enroll")
async def enroll_voice_print(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    audio: UploadFile = File(...),
) -> Any:
    """Enrolls a user's voice print from a single audio file (legacy support)."""
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
        db.commit()
        db.refresh(current_user)

        return {
            "ok": True,
            "message": "تم تسجيل بصمة الصوت بنجاح!",
            "has_voiceprint": True
        }
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
    if not audio_files or len(audio_files) == 0:
        raise HTTPException(status_code=400, detail="At least one audio file is required")

    embeddings: list[list[float]] = []
    tmp_paths: list[str] = []

    try:
        # Extract embedding from each audio file
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

        if len(embeddings) < 2:
            print(f"[Voice Enroll] Warning: only {len(embeddings)} valid sample(s), ideally need 3")

        # Average all embeddings for a robust voiceprint
        emb_array = np.array(embeddings, dtype=np.float32)
        avg_embedding = np.mean(emb_array, axis=0)

        # L2 normalize the averaged embedding
        norm = np.linalg.norm(avg_embedding)
        if norm > 0:
            avg_embedding = avg_embedding / norm

        final_embedding = avg_embedding.tolist()
        print(f"[Voice Enroll] Final embedding: {len(final_embedding)}-dim from {len(embeddings)} samples")

        # Save to database
        current_user.voice_embedding = json.dumps(final_embedding)
        db.commit()
        db.refresh(current_user)

        return {
            "ok": True,
            "message": f"تم تسجيل بصمة الصوت بنجاح من {len(embeddings)} عينات!",
            "has_voiceprint": True,
            "samples_used": len(embeddings),
            "engine": voice_service.get_status()["engine"],
            "embedding_dim": len(final_embedding),
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
                except:
                    pass


@router.delete("/enroll")
def delete_voice_print(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Resets/deletes the user's voice print so they can re-record."""
    current_user.voice_embedding = None
    db.commit()
    return {"ok": True, "message": "Voice print deleted"}
