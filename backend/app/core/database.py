import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# PostgreSQL via DATABASE_URL (production / Supabase); otherwise SQLite for local dev
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    engine = create_engine(DATABASE_URL)
else:
    if os.name == "nt":
        data_dir = Path(__file__).resolve().parents[2] / "data"
    else:
        data_dir = Path("/tmp")
    data_dir.mkdir(parents=True, exist_ok=True)
    sqlite_file = data_dir / "interview_ai.db"
    DATABASE_URL = f"sqlite:///{sqlite_file.as_posix()}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
