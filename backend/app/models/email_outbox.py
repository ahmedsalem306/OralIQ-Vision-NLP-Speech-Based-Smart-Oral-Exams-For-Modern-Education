from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Index
from app.core.database import Base


class EmailOutbox(Base):
    __tablename__ = "email_outbox"
    id = Column(Integer, primary_key=True)
    token_id = Column(Integer, ForeignKey("email_verification_tokens.id", ondelete="CASCADE"), nullable=False, unique=True)
    kind = Column(String(32), nullable=False)
    encrypted_payload = Column(Text, nullable=True)
    delivery_key = Column(String(64), nullable=False, unique=True)
    status = Column(String(16), nullable=False, default="queued")
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    next_attempt_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    lease_until = Column(DateTime, nullable=True)
    lease_token = Column(String(64), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_code = Column(String(40), nullable=True)
    __table_args__ = (Index("ix_email_outbox_due", "status", "next_attempt_at"),)


class EmailDeliveryState(Base):
    __tablename__ = "email_delivery_state"
    id = Column(Integer, primary_key=True)
    day_key = Column(String(10), nullable=False, default="")
    day_reserved = Column(Integer, nullable=False, default=0)
    month_key = Column(String(7), nullable=False, default="")
    month_reserved = Column(Integer, nullable=False, default=0)
    busy_until = Column(DateTime, nullable=True)
    next_send_at = Column(DateTime, nullable=True)
    pause_until = Column(DateTime, nullable=True)
    last_error_code = Column(String(40), nullable=True)
    last_error_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
