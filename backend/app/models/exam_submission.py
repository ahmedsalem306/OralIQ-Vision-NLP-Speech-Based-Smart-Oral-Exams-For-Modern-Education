from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ExamSubmission(Base):
    """A student's submission for a specific exam question."""
    __tablename__ = "exam_submissions"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Student info (filled in check-in form)
    student_name = Column(String)
    student_number = Column(String)

    # AI results (filled after processing)
    transcript = Column(Text, nullable=True)
    nlp_score = Column(Float, nullable=True)       # 0-100 answer quality
    facial_score = Column(Float, nullable=True)    # 0-100 integrity
    speech_score = Column(Float, nullable=True)    # 0-100 fluency
    overall_score = Column(Float, nullable=True)   # 0-100 combined
    cheat_report = Column(Text, nullable=True)     # Arabic anti-cheat report
    fluency_report = Column(Text, nullable=True)   # Arabic fluency report

    # Visibility: lecturer can toggle whether student sees their grade
    grade_visible = Column(Integer, default=0)     # 0=hidden, 1=visible

    started_at = Column(DateTime, nullable=True)   # Time when Ready was clicked
    finished_at = Column(DateTime, nullable=True)  # Time when recording ended (precise duration)
    submitted_at = Column(DateTime, default=datetime.utcnow) # Time when DB record was saved

    # Relationships
    question = relationship("Question", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id])
