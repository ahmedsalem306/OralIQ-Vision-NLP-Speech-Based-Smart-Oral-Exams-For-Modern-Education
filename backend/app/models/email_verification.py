from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmailVerificationToken(Base):
    """
    One verification link. This record stores only its secret's SHA-256. Queued mail holds
    an authenticated-encrypted payload under a separate key derived from the application secret.
    Completing a link also needs the password chosen at sign-up
    (kept here as a hash, applied to the account only on success): whoever registered and whoever
    reads the mailbox must be the same person.
    """
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    sent_to = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)          # set when used, or when superseded/cancelled
    failed_attempts = Column(Integer, nullable=False, default=0)

    pending_password_hash = Column(Text, nullable=False)
    pending_full_name = Column(String, nullable=True)
    pending_role = Column(String(32), nullable=True)

    user = relationship("User")
