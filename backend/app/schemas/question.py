from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class QuestionBase(BaseModel):
    text: str
    model_answer: str
    keywords: str = ""
    difficulty: str = "medium"
    category: str = "general"
    duration_minutes: int = 2

class QuestionCreate(QuestionBase):
    group_token: Optional[str] = None  # if provided, add to existing exam group

class QuestionOut(QuestionBase):
    id: int
    exam_token: str
    group_token: Optional[str] = None
    order_index: int = 0
    creator_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
