from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

ALLOWED_SIGNUP_ROLES = {"student", "lecturer", "hr"}


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=120)
    role: str = Field(default="student", max_length=32)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        role_clean = (v or "student").strip().lower()
        if role_clean not in ALLOWED_SIGNUP_ROLES:
            raise ValueError("Invalid role. Allowed roles: student, lecturer")
        return role_clean

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
