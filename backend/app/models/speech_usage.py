"""Durable account-wide provider admission; contains no audio, text or keys."""
from sqlalchemy import Column, DateTime, Index, Integer, String
from app.core.database import Base


class SpeechProviderControl(Base):
    __tablename__ = 'speech_provider_controls'
    provider = Column(String(16), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    blocked_until = Column(DateTime, nullable=True)


class SpeechProviderUsage(Base):
    __tablename__ = 'speech_provider_usage'
    id = Column(Integer, primary_key=True)
    provider = Column(String(16), nullable=False)
    reserved_at = Column(DateTime, nullable=False)
    audio_seconds = Column(Integer, nullable=False)
    __table_args__ = (Index('ix_speech_provider_usage_window', 'provider', 'reserved_at'),)
