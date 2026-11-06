from pydantic import BaseModel, Field, field_serializer, model_validator
from typing import Optional
from datetime import datetime, timezone


def schedule_timestamp(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    utc = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    return utc.isoformat().replace("+00:00", "Z")


class ExamSchedule(BaseModel):
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_window(self):
        for value in (self.opens_at, self.closes_at):
            if value is not None and (value.tzinfo is None or value.utcoffset() is None):
                raise ValueError("Schedule times must include a timezone")
        if self.opens_at and self.closes_at and self.closes_at <= self.opens_at:
            raise ValueError("Closing time must be after opening time")
        return self


class QuestionBase(BaseModel):
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None

    @field_serializer("opens_at", "closes_at")
    def serialize_window(self, value):
        return schedule_timestamp(value)
    text: str = Field(..., min_length=2, max_length=4000)
    model_answer: str = Field(..., min_length=1, max_length=8000)
    keywords: str = Field(default="", max_length=2000)
    difficulty: str = Field(default="medium", max_length=50)
    category: str = Field(default="general", max_length=120)
    duration_minutes: int = Field(default=2, ge=1, le=180)
    # Attempts per student at the exam this question belongs to (the exam's first question decides).
    max_attempts: int = Field(default=1, ge=1, le=10)
    # manual: grades hidden until the lecturer publishes; immediate: shown once graded.
    results_policy: str = Field(default="manual", pattern="^(manual|immediate)$")


class QuestionCreate(QuestionBase, ExamSchedule):
    group_token: Optional[str] = Field(default=None, max_length=128)


class QuestionOut(QuestionBase):
    """Full question schema for lecturers (includes model_answer & keywords)."""
    id: int
    exam_token: str
    group_token: Optional[str] = None
    order_index: int = 0
    creator_id: Optional[int] = None
    created_at: Optional[datetime] = None
    results_published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuestionPublicOut(BaseModel):
    """
    Sanitized public question schema for students in the Exam Room.
    Strictly omits `model_answer` and `keywords` to prevent answer-key leakage in DevTools.
    """
    id: int
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None

    @field_serializer("opens_at", "closes_at")
    def serialize_window(self, value):
        return schedule_timestamp(value)
    text: str
    difficulty: str = "medium"
    category: str = "general"
    duration_minutes: int = 2
    max_attempts: int = 1
    exam_token: str
    group_token: Optional[str] = None
    order_index: int = 0
    creator_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
