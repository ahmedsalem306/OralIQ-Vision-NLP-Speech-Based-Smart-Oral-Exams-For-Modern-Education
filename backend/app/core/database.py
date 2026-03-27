import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Support PostgreSQL via env var (production), fallback to SQLite in /tmp (writable on HF Spaces)
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL — no extra connect_args needed
    engine = create_engine(DATABASE_URL)
else:
    # SQLite — use /tmp so it's writable on Hugging Face Spaces
    SQLITE_PATH = "/tmp/interview_ai.db"
    DATABASE_URL = f"sqlite:///{SQLITE_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
