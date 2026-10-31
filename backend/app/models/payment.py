import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from app.core.database import Base


class Payment(Base):
    """A checkout attempt (plan subscription or add-on exam pack)."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(64), unique=True, index=True, default=lambda: f"oiq_{uuid.uuid4().hex}")
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    kind = Column(String(16), default="plan")      # plan | addon
    plan_id = Column(String(32), nullable=True)
    period = Column(String(16), nullable=True)     # monthly | term | yearly
    addon_exams = Column(Integer, default=0)

    amount = Column(Integer)                       # whole currency units (EGP / USD)
    currency = Column(String(8), default="EGP")
    provider = Column(String(16))                  # paymob | stripe | sandbox | manual
    status = Column(String(16), default="pending", index=True)  # pending | paid | failed
    provider_txn_id = Column(String(128), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    note = Column(Text, nullable=True)
