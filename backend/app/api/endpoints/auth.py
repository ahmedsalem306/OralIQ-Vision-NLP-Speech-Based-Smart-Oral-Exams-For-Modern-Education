import os
import secrets
import time
from datetime import timedelta
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserOut

router = APIRouter()

_DUMMY_HASH = security.get_password_hash("oraliq-timing-equaliser")
# Block public hardcoded passwords used by the retired fake social login modal so any legacy
# account created through it cannot be taken over via password login (must use verified Google Sign-In).
_RETIRED_FAKE_OAUTH_PASSWORDS = {
    "oauth_google_oraliq_2026!",
    "oauth_github_oraliq_2026!",
}


@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    email_norm = (form_data.username or "").strip().lower()
    raw_password = form_data.password or ""
    if len(email_norm) > 254 or len(raw_password) > 128:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if raw_password.strip().lower() in _RETIRED_FAKE_OAUTH_PASSWORDS:
        security.verify_password(raw_password, _DUMMY_HASH)
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    user = db.query(User).filter(User.email == email_norm).first()
    if not user:
        # Fallback case-insensitive match for legacy records
        user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        security.verify_password(form_data.password, _DUMMY_HASH)  # same timing as a real miss
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserOut)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    try:
        email_norm = user_in.email.strip().lower()
        user = db.query(User).filter(User.email == email_norm).first()
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this email already exists in the system",
            )
        user = User(
            email=email_norm,
            hashed_password=security.get_password_hash(user_in.password),
            full_name=(user_in.full_name or "").strip()[:120] or None,
            role=user_in.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Registration failed due to an internal error",
        )



# ── Sign in with Google ───────────────────────────────────────────────────────
# The browser gets an ID token from Google Identity Services and posts it here.
# We verify it with Google's tokeninfo endpoint (no extra dependency) and check
# audience / issuer / expiry / verified e-mail ourselves before trusting it.
# Enabled simply by setting GOOGLE_CLIENT_ID (comma-separated for several clients).

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
GOOGLE_SIGNUP_ROLES = {"student", "lecturer"}


def _google_client_ids() -> List[str]:
    raw = os.environ.get("GOOGLE_CLIENT_ID") or ""
    return [c.strip() for c in raw.split(",") if c.strip()]


def _fetch_google_tokeninfo(credential: str) -> Optional[dict]:
    """Network call to Google. Returns the decoded claims, or None if Google rejects the token."""
    try:
        resp = httpx.get(GOOGLE_TOKENINFO_URL, params={"id_token": credential}, timeout=10.0)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach Google to verify the sign-in. Try again.")
    if resp.status_code != 200:
        return None
    try:
        data = resp.json()
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def verify_google_id_token(credential: str, client_ids: List[str]) -> dict:
    claims = _fetch_google_tokeninfo(credential)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid Google credential")
    if claims.get("aud") not in client_ids:
        raise HTTPException(status_code=401, detail="Google credential was issued for a different app")
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(status_code=401, detail="Invalid Google credential issuer")
    try:
        exp = int(claims.get("exp", 0))
    except (TypeError, ValueError):
        exp = 0
    if exp <= int(time.time()):
        raise HTTPException(status_code=401, detail="Google credential has expired")
    if str(claims.get("email_verified", "")).lower() != "true":
        raise HTTPException(status_code=401, detail="Google account e-mail is not verified")
    if not claims.get("email"):
        raise HTTPException(status_code=401, detail="Google credential has no e-mail")
    return claims


class GoogleLoginIn(BaseModel):
    credential: str = Field(..., min_length=10, max_length=8192)
    role: Optional[str] = Field(default=None, max_length=32)


@router.get("/auth/google/config")
def google_auth_config() -> Any:
    ids = _google_client_ids()
    return {"enabled": bool(ids), "client_id": ids[0] if ids else None}


@router.post("/login/google")
def login_google(
    payload: GoogleLoginIn,
    db: Session = Depends(deps.get_db),
) -> Any:
    client_ids = _google_client_ids()
    if not client_ids:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not configured on this server (GOOGLE_CLIENT_ID is not set).",
        )

    role = (payload.role or "").strip().lower() or None
    if role is not None and role not in GOOGLE_SIGNUP_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role. Allowed roles: student, lecturer")

    claims = verify_google_id_token(payload.credential, client_ids)
    email_norm = str(claims["email"]).strip().lower()
    if len(email_norm) > 254:
        raise HTTPException(status_code=400, detail="E-mail address is too long")

    user = db.query(User).filter(User.email == email_norm).first()
    if user is None:
        if role is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "ROLE_REQUIRED",
                    "message": "No account exists for this Google e-mail yet. Choose student or lecturer to create one.",
                    "email": email_norm,
                },
            )
        try:
            user = User(
                email=email_norm,
                # Random secret nobody knows: password login stays impossible until a reset.
                hashed_password=security.get_password_hash(secrets.token_urlsafe(48)),
                full_name=(str(claims.get("name") or "").strip()[:120] or None),
                role=role,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Could not create the account. Try again.")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }
