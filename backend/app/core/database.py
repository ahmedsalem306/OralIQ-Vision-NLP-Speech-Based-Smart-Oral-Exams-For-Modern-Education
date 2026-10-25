import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# PostgreSQL via DATABASE_URL (production / Supabase); otherwise SQLite for local dev
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # ── Production: PostgreSQL with high-concurrency connection pooling ──
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.environ.get("DB_POOL_SIZE", "30")),
        max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "50")),
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        poolclass=QueuePool,
        echo=False,
    )
else:
    # ── SQLite fallback with high-concurrency WAL + memory-mapped I/O ──
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
        connect_args={"check_same_thread": False, "timeout": 15},
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.execute("PRAGMA cache_size=-64000")       # 64MB page cache in RAM
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=268435456")     # 256MB memory-mapped I/O
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _migration_engine():
    """DDL (ALTER TABLE) needs a direct Postgres connection — not Supabase transaction pooler (port 6543)."""
    direct_url = os.environ.get("DATABASE_URL_DIRECT") or os.environ.get("DIRECT_URL")
    if direct_url:
        return create_engine(direct_url, pool_pre_ping=True)
    return engine


def _column_exists(table: str, column: str, eng=None) -> bool:
    from sqlalchemy import inspect
    eng = eng or engine
    insp = inspect(eng)
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def _exec_ddl(ddl: str) -> None:
    from sqlalchemy import text
    mig_eng = _migration_engine()
    if mig_eng.dialect.name == "postgresql":
        with mig_eng.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text(ddl))
    else:
        with mig_eng.begin() as conn:
            conn.execute(text(ddl))


def _add_column(table: str, column: str, ddl: str) -> None:
    if _column_exists(table, column):
        return
    _exec_ddl(ddl)
    print(f"[DB Migration] Added {table}.{column}")


def run_migrations():
    """Lightweight schema patches + high-scale index creation for SQLite / PostgreSQL."""
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        table_names = set(insp.get_table_names())
        if "users" not in table_names:
            print("[DB Migration] users table not found — skipping patches")
            return

        is_pg = engine.dialect.name == "postgresql"
        bool_false = "FALSE" if is_pg else "0"
        bool_true = "TRUE" if is_pg else "1"
        len_fn = "char_length" if is_pg else "length"

        if is_pg:
            _add_column("users", "voice_locked", "ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_locked BOOLEAN DEFAULT FALSE")
            _add_column("users", "voice_reenroll_allowed", "ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_reenroll_allowed BOOLEAN DEFAULT FALSE")
            _add_column("users", "face_embedding", "ALTER TABLE users ADD COLUMN IF NOT EXISTS face_embedding TEXT")
            _add_column("users", "face_locked", "ALTER TABLE users ADD COLUMN IF NOT EXISTS face_locked BOOLEAN DEFAULT FALSE")
        else:
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

        _exec_ddl("CREATE INDEX IF NOT EXISTS ix_users_role ON users (role)")

        if "questions" in table_names:
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_questions_creator_id ON questions (creator_id)")
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_questions_exam_token ON questions (exam_token)")
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_questions_group_token ON questions (group_token, order_index)")

        if "exam_submissions" in table_names:
            if is_pg:
                _add_column("exam_submissions", "face_score", "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS face_score DOUBLE PRECISION")
                _add_column("exam_submissions", "submission_key", "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS submission_key VARCHAR")
            else:
                _add_column("exam_submissions", "face_score", "ALTER TABLE exam_submissions ADD COLUMN face_score FLOAT")
                _add_column("exam_submissions", "submission_key", "ALTER TABLE exam_submissions ADD COLUMN submission_key VARCHAR")

            _exec_ddl(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_exam_submissions_submission_key "
                "ON exam_submissions (submission_key)"
            )
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_exam_submissions_question_id ON exam_submissions (question_id)")
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_exam_submissions_student_id ON exam_submissions (student_id, grade_visible)")

        if "exam_assignments" in table_names:
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_exam_assignments_student_status ON exam_assignments (student_id, status)")
            _exec_ddl("CREATE INDEX IF NOT EXISTS ix_exam_assignments_question_id ON exam_assignments (question_id)")

        print("[DB Migration] All patches and scalability indexes applied successfully")
        return {"ok": True, "face_embedding": _column_exists("users", "face_embedding")}
    except Exception as e:
        print(f"[DB Migration] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"ok": False, "error": str(e)}


_migrations_applied = False


def ensure_migrations() -> dict:
    """Run migrations once per process."""
    global _migrations_applied
    if _migrations_applied:
        return {"ok": True, "cached": True}
    result = run_migrations()
    if result and result.get("ok"):
        _migrations_applied = True
    return result or {"ok": False}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
