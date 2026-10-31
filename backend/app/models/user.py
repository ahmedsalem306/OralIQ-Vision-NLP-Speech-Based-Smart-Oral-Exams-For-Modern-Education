from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="student")  # 'student', 'lecturer', 'hr'
    voice_embedding = Column(Text, nullable=True)  # JSON-encoded array of float embedding
    voice_locked = Column(Boolean, default=False)  # True after first enrollment — blocks re-enroll
    voice_reenroll_allowed = Column(Boolean, default=False)  # lecturer can temporarily allow re-enroll
    face_embedding = Column(Text, nullable=True)  # JSON 512-dim InsightFace ArcFace embedding
    face_locked = Column(Boolean, default=False)
    plan_tier = Column(String, default="free")  # 'free', 'pro', 'campus', 'enterprise'
    plan_updated_at = Column(String, nullable=True)
    exams_created_count = Column(Integer, default=0)  # Cumulative exams ever created (cannot be bypassed by deleting exams) — free trial quota

    # ── Subscription cycle (see app/core/plans.py & app/services/billing_service.py) ──
    plan_period = Column(String, nullable=True)           # monthly | term | yearly
    plan_started_at = Column(DateTime, nullable=True)     # naive UTC
    plan_expires_at = Column(DateTime, nullable=True)     # naive UTC; NULL = no expiry (free)
    cycle_started_at = Column(DateTime, nullable=True)    # start of current 30-day quota cycle
    cycle_exams_used = Column(Integer, default=0)         # exams created in current cycle (paid plans)
    bonus_exams = Column(Integer, default=0)              # add-on packs, never expire
    custom_max_exams = Column(Integer, nullable=True)     # enterprise contract override
    custom_max_students = Column(Integer, nullable=True)  # enterprise contract override
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # assistant -> billing owner
