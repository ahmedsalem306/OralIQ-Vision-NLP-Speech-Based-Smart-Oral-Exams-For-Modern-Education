from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import tempfile
import os
import traceback

from app.api import deps
from app.models.user import User

router = APIRouter()


@router.post("/transcribe")
async def transcribe_speech(
    *,
    current_user: User = Depends(deps.get_current_user),
    audio: UploadFile = File(...),
    hint: str = Form(""),
) -> Any:
    """Convert a short voice recording to text (Whisper). Used when lecturers dictate questions."""
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required")

    suffix = os.path.splitext(audio.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        if len(content) < 500:
            raise HTTPException(status_code=422, detail="Recording too short — speak longer")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        from app.services.speech_ai import speech_analyzer
        text = speech_analyzer.transcribe_audio(tmp_path, hint=hint)
        if not text or not text.strip():
            raise HTTPException(status_code=422, detail="Could not detect speech in recording")
        return {"text": text.strip()}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Speech Transcribe Error] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
