from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.api import deps
from app.models.user import User
from app.services.face_biometrics import face_biometrics_service, EMBEDDING_DIM
from app.api.endpoints.voice import _can_enroll
from pydantic import BaseModel, Field

router = APIRouter()


def _has_faceprint(user: User) -> bool:
    return bool(user.face_embedding and len(user.face_embedding) > 10)


class FaceEnrollBody(BaseModel):
    embedding: list[float] = Field(..., min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)


class FaceVerifyBody(BaseModel):
    embedding: list[float] = Field(..., min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM)


@router.get("/status")
def get_face_status(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    has_face = _has_faceprint(current_user)
    return {
        "has_faceprint": has_face,
        "face_locked": bool(current_user.face_locked) if has_face else False,
        "can_reenroll": _can_enroll(current_user),
        "embedding_dim": EMBEDDING_DIM,
    }


@router.post("/enroll")
def enroll_face_print(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    body: FaceEnrollBody,
) -> Any:
    """Store Face ID descriptor computed in the browser (face-api.js)."""
    if not _can_enroll(current_user):
        raise HTTPException(
            status_code=403,
            detail="Face ID مقفول — اطلب من المحاضر السماح بإعادة التسجيل",
        )

    if len(body.embedding) != EMBEDDING_DIM:
        raise HTTPException(status_code=422, detail=f"Expected {EMBEDDING_DIM}-dim face embedding")

    current_user.face_embedding = json.dumps(body.embedding)
    current_user.face_locked = True
    db.commit()
    db.refresh(current_user)

    return {
        "ok": True,
        "message": "تم تسجيل Face ID بنجاح!",
        "has_faceprint": True,
        "face_locked": True,
        "embedding_dim": EMBEDDING_DIM,
    }


@router.post("/verify")
def verify_face_print(
    *,
    current_user: User = Depends(deps.get_current_user),
    body: FaceVerifyBody,
) -> Any:
    if not _has_faceprint(current_user):
        raise HTTPException(status_code=400, detail="لا يوجد Face ID مسجّل لهذا الحساب")

    stored = json.loads(current_user.face_embedding)
    result = face_biometrics_service.verify_face(stored, body.embedding)
    return {
        "ok": True,
        "is_match": bool(result["is_match"]),
        "similarity_score": result["similarity_score"],
        "distance": result["distance"],
        "report": result["report"],
    }


@router.get("/descriptor")
def get_face_descriptor(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Returns enrolled descriptor for client-side live verification during exam."""
    if not _has_faceprint(current_user):
        raise HTTPException(status_code=404, detail="لا يوجد Face ID مسجّل")
    return {
        "embedding": json.loads(current_user.face_embedding),
        "embedding_dim": EMBEDDING_DIM,
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
