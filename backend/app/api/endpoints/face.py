from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import json

from app.api import deps
from app.models.user import User
from app.services.face_biometrics import face_biometrics_service, EMBEDDING_DIM
from app.services.gaze_ai import gaze_ai_service
from app.api.endpoints.voice import _can_enroll

router = APIRouter()


def _has_faceprint(user: User) -> bool:
    if not user.face_embedding or len(user.face_embedding) < 10:
        return False
    try:
        emb = json.loads(user.face_embedding)
        return isinstance(emb, list) and len(emb) == EMBEDDING_DIM
    except Exception:
        return False


@router.get("/status")
def get_face_status(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    has_face = _has_faceprint(current_user)
    stale = False
    if current_user.face_embedding and len(current_user.face_embedding) > 10 and not has_face:
        stale = True  # old face-api.js 128-d — must re-enroll
    return {
        "has_faceprint": has_face,
        "face_locked": bool(current_user.face_locked) if has_face else False,
        "can_reenroll": _can_enroll(current_user) or stale,
        "embedding_dim": EMBEDDING_DIM,
        "engine": "insightface",
        "needs_reenroll": stale,
        "face_ready": face_biometrics_service.get_status(),
        "gaze_ready": gaze_ai_service.get_status(),
    }


@router.post("/enroll")
async def enroll_face_print(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    images: List[UploadFile] = File(...),
) -> Any:
    """
    Enroll Face ID from 3–8 JPEG snapshots.
    InsightFace ArcFace embeddings averaged on the server (no browser model).
    """
    stale = bool(current_user.face_embedding) and not _has_faceprint(current_user)
    if not _can_enroll(current_user) and not stale:
        raise HTTPException(
            status_code=403,
            detail="Face ID مقفول — اطلب من المحاضر السماح بإعادة التسجيل",
        )

    if len(images) < 3:
        raise HTTPException(status_code=422, detail="أرسل 3 صور على الأقل لمسح Face ID")
    if len(images) > 10:
        raise HTTPException(status_code=422, detail="حد أقصى 10 صور")

    embeddings: list[list[float]] = []
    errors: list[str] = []
    for i, up in enumerate(images):
        try:
            raw = await up.read()
            if len(raw) < 500:
                errors.append(f"image[{i}]: too small")
                continue
            extracted = face_biometrics_service.extract_embedding(raw)
            embeddings.append(extracted["embedding"])
        except Exception as e:
            errors.append(f"image[{i}]: {e}")

    if len(embeddings) < 3:
        raise HTTPException(
            status_code=400,
            detail="Face not clear enough ({}/3). Improve lighting and try again. {}".format(
                len(embeddings), errors[:2]
            ),
        )

    avg = face_biometrics_service.average_embeddings(embeddings)
    current_user.face_embedding = json.dumps(avg)
    current_user.face_locked = True
    db.commit()
    db.refresh(current_user)

    return {
        "ok": True,
        "message": "تم تسجيل Face ID بنجاح (InsightFace)!",
        "has_faceprint": True,
        "face_locked": True,
        "embedding_dim": EMBEDDING_DIM,
        "samples_used": len(embeddings),
        "engine": "insightface",
    }


@router.post("/verify")
async def verify_face_print(
    *,
    current_user: User = Depends(deps.get_current_user),
    image: UploadFile = File(...),
) -> Any:
    if not _has_faceprint(current_user):
        raise HTTPException(
            status_code=400,
            detail="لا يوجد Face ID مسجّل (أو قديم) — أعد تسجيل Face ID من الإعدادات",
        )

    raw = await image.read()
    stored = json.loads(current_user.face_embedding)
    try:
        result = face_biometrics_service.verify_image(stored, raw, threshold=0.32)
    except ValueError as e:
        return {
            "ok": True,
            "is_match": False,
            "similarity_score": 0.0,
            "no_face": True,
            "report": str(e),
        }

    return {
        "ok": True,
        "is_match": bool(result["is_match"]),
        "similarity_score": result["similarity_score"],
        "distance": result.get("distance"),
        "cosine": result.get("cosine"),
        "report": result["report"],
        "num_faces": result.get("num_faces"),
        "engine": "insightface",
    }


@router.post("/gaze")
async def analyze_gaze(
    *,
    current_user: User = Depends(deps.get_current_user),
    image: UploadFile = File(...),
) -> Any:
    """MobileGaze ONNX — pitch/yaw + direction for proctoring."""
    raw = await image.read()
    try:
        result = gaze_ai_service.analyze_image_bytes(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gaze failed: {e}")
    return {"ok": True, **result, "engine": "mobilegaze"}


@router.get("/descriptor")
def get_face_descriptor(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Legacy: client no longer verifies locally — kept for debugging."""
    if not _has_faceprint(current_user):
        raise HTTPException(status_code=404, detail="لا يوجد Face ID مسجّل (InsightFace 512-d)")
    return {
        "embedding": json.loads(current_user.face_embedding),
        "embedding_dim": EMBEDDING_DIM,
        "engine": "insightface",
    }


@router.delete("/enroll")
def delete_face_print(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    from app.api.endpoints.voice import _has_voiceprint

    if _has_faceprint(current_user) and current_user.face_locked and not current_user.voice_reenroll_allowed:
        raise HTTPException(
            status_code=403,
            detail="لا يمكن حذف Face ID — اطلب من المحاضر السماح بإعادة التسجيل",
        )
    current_user.face_embedding = None
    current_user.face_locked = False
    db.commit()
    return {"ok": True, "message": "Face ID deleted"}
