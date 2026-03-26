from pydantic import BaseModel
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
    nlp_score: Optional[float] = None
    facial_score: Optional[float] = None
    speech_score: Optional[float] = None
    overall_score: Optional[float] = None
    cheat_report: Optional[str] = None
    fluency_report: Optional[str] = None
    grade_visible: int = 0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    question_text: Optional[str] = None
    question_category: Optional[str] = None

    class Config:
        from_attributes = True
