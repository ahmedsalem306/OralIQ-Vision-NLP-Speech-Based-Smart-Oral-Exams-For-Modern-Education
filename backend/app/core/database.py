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
    # ── SQLite fallback ──
    # HF Spaces: /tmp يتنظف مع كل Restart → الحسابات والأسئلة بتضيع.
    # لو فعّلت Persistent Storage على الـ Space، المسار /data بيفضل.
    if os.name == "nt":
        data_dir = Path(__file__).resolve().parents[2] / "data"
    else:
        hf_data = Path("/data")
        data_dir = hf_data if hf_data.exists() and os.access(hf_data, os.W_OK) else Path("/tmp")
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


def _column_exists(table: str, column: str) -> bool:
    from sqlalchemy import inspect
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def _add_column(table: str, column: str, ddl: str) -> None:
    from sqlalchemy import text
    if _column_exists(table, column):
        return
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print(f"[DB Migration] Added {table}.{column}")


def run_migrations():
    """Lightweight schema patches for SQLite / existing PostgreSQL databases."""
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            print("[DB Migration] users table not found — skipping patches")
            return

        is_pg = engine.dialect.name == "postgresql"
        bool_false = "FALSE" if is_pg else "0"
        bool_true = "TRUE" if is_pg else "1"
        len_fn = "char_length" if is_pg else "length"

        # Each ALTER in its own transaction — one failure must not block the rest
        _add_column("users", "voice_locked", f"ALTER TABLE users ADD COLUMN voice_locked BOOLEAN DEFAULT {bool_false}")
        _add_column("users", "voice_reenroll_allowed", f"ALTER TABLE users ADD COLUMN voice_reenroll_allowed BOOLEAN DEFAULT {bool_false}")
        _add_column("users", "face_embedding", "ALTER TABLE users ADD COLUMN face_embedding TEXT")
        _add_column("users", "face_locked", f"ALTER TABLE users ADD COLUMN face_locked BOOLEAN DEFAULT {bool_false}")

        with engine.begin() as conn:
            conn.execute(text(
                f"UPDATE users SET voice_locked = {bool_true} "
                f"WHERE voice_embedding IS NOT NULL AND {len_fn}(voice_embedding) > 10 "
                f"AND (voice_locked IS NULL OR voice_locked = {bool_false})"
            ))
            conn.execute(text(
                f"UPDATE users SET face_locked = {bool_true} "
                f"WHERE face_embedding IS NOT NULL AND {len_fn}(face_embedding) > 10 "
                f"AND (face_locked IS NULL OR face_locked = {bool_false})"
            ))

        if "exam_submissions" in insp.get_table_names():
            _add_column("exam_submissions", "face_score", "ALTER TABLE exam_submissions ADD COLUMN face_score FLOAT")

        print("[DB Migration] All patches applied successfully")
    except Exception as e:
        print(f"[DB Migration] ERROR: {e}")
        import traceback
        traceback.print_exc()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
