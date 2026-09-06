from sqlalchemy import Column, Integer, String, Boolean, Text
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="student")  # 'student' or 'hr'
    voice_embedding = Column(Text, nullable=True)  # JSON-encoded array of float embedding
    voice_locked = Column(Boolean, default=False)  # True after first enrollment — blocks re-enroll
    voice_reenroll_allowed = Column(Boolean, default=False)  # lecturer can temporarily allow re-enroll

