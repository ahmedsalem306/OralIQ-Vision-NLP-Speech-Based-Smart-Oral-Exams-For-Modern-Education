from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime

class ExamSubmissionCreate(BaseModel):
    question_id: int
    student_name: str
    student_number: str
    started_at: Optional[datetime] = None

class ExamSubmissionOut(BaseModel):
    id: int
    question_id: int
    student_name: str
    student_number: str
    transcript: Optional[str] = None
    # Scores are clamped 0–100 server-side; negative values are rejected.
    nlp_score: Optional[float] = Field(default=None, ge=0, le=100)
    facial_score: Optional[float] = Field(default=None, ge=0, le=100)
    speech_score: Optional[float] = Field(default=None, ge=0, le=100)
    voice_score: Optional[float] = Field(default=None, ge=0, le=100)
    face_score: Optional[float] = Field(default=None, ge=0, le=100)
    overall_score: Optional[float] = Field(default=None, ge=0, le=100)
    cheat_report: Optional[str] = None
    fluency_report: Optional[str] = None
    grade_visible: int = 0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    question_text: Optional[str] = None
    question_category: Optional[str] = None
    lecturer_name: Optional[str] = None

    class Config:
        from_attributes = True
