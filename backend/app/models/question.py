import uuid
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)
    model_answer = Column(Text)
    keywords = Column(String, default="")
    difficulty = Column(String, default="medium")   # easy, medium, hard
    category = Column(String, default="general")
    duration_minutes = Column(Integer, default=2)

    # Ownership & sharing
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    exam_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    submissions = relationship("ExamSubmission", back_populates="question")
