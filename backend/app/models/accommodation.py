from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from app.core.database import Base


class BiometricPreference(Base):
    __tablename__ = "biometric_preferences"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    mode = Column(String(20), nullable=False, default="face")
    chosen_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ExamAccommodation(Base):
    __tablename__ = "exam_accommodations"
    __table_args__ = (UniqueConstraint("user_id", "exam_key", name="uq_accommodation_student_exam"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exam_key = Column(String(128), nullable=False, index=True)
    lecturer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending")
    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
