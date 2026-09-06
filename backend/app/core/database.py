import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# PostgreSQL via DATABASE_URL (production / Supabase); otherwise SQLite for local dev
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # ── Production: PostgreSQL with connection pooling ──
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,            # 20 persistent connections
        max_overflow=30,         # 30 extra connections under load (total: 50)
        pool_timeout=30,         # wait 30s for a connection before error
        pool_recycle=1800,       # recycle connections every 30min (avoids stale)
        pool_pre_ping=True,      # test connection before using (auto-reconnect)
        poolclass=QueuePool,
        echo=False,
    )
else:
    # ── Local dev: SQLite ──
    if os.name == "nt":
        data_dir = Path(__file__).resolve().parents[2] / "data"
    else:
        data_dir = Path("/tmp")
    data_dir.mkdir(parents=True, exist_ok=True)
    sqlite_file = data_dir / "interview_ai.db"
    DATABASE_URL = f"sqlite:///{sqlite_file.as_posix()}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    # Enable WAL mode for SQLite (much better concurrent reads)
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    """Lightweight schema patches for SQLite / existing PostgreSQL databases."""
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "voice_locked" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN voice_locked BOOLEAN DEFAULT 0"))
            if "voice_reenroll_allowed" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN voice_reenroll_allowed BOOLEAN DEFAULT 0"))
            conn.execute(text(
                "UPDATE users SET voice_locked = 1 "
                "WHERE voice_embedding IS NOT NULL AND length(voice_embedding) > 10 "
                "AND (voice_locked IS NULL OR voice_locked = 0)"
            ))
    except Exception as e:
        print(f"[DB Migration] Warning: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
