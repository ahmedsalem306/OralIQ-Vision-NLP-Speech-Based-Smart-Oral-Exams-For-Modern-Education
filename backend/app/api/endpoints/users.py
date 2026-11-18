from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.core import security
from app.schemas.user import AccountTypeChange, UserOut
from app.services.account_type import correction_blocker

router = APIRouter()

@router.get("/me", response_model=UserOut)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/me/account-type")
def account_type_options(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    blocker = correction_blocker(db, current_user)
    return {"role": current_user.role, "can_change": blocker is None, "reason": blocker}


@router.post("/me/account-type")
def correct_account_type(
    request: AccountTypeChange,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    # Serialize competing corrections and read the latest role, not an ORM-cached snapshot.
    authenticated_version = int(current_user.token_version or 0)
    user = db.query(User).filter(User.id == current_user.id).populate_existing().with_for_update().one()
    if not user.is_active or int(user.token_version or 0) != authenticated_version:
        raise HTTPException(status_code=401, detail="Session changed. Sign in again.")
    if user.role != request.current_role:
        raise HTTPException(status_code=409, detail={"code": "ACCOUNT_TYPE_CHANGED"})
    blocker = correction_blocker(db, user)
    if blocker:
        raise HTTPException(status_code=409, detail={"code": "ACCOUNT_TYPE_LOCKED", "reason": blocker})
    if user.role == request.role:
        raise HTTPException(status_code=400, detail={"code": "ACCOUNT_TYPE_UNCHANGED"})
    user.role = request.role
    # All other open sessions must reload their permissions by signing in again.
    user.token_version = int(user.token_version or 0) + 1
    db.commit()
    return {
        "user": UserOut.model_validate(user),
        "access_token": security.create_access_token(user.id, token_version=user.token_version),
        "token_type": "bearer",
    }
