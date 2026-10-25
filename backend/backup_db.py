"""
Database Backup Utility for OralIQ
Creates a full verified backup of:
1. The active database configured in local.env / DATABASE_URL (PostgreSQL or SQLite)
2. All local SQLite database files (.db) using SQLite's atomic online backup API + SQL dump.
"""
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "local.env")

from sqlalchemy import inspect, text
from app.core.database import engine

BACKUP_ROOT = Path(r"d:\interview-ai\backups")
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP_DIR = BACKUP_ROOT / f"oraliq_backup_{TIMESTAMP}"


def backup_active_sqlalchemy_db(target_dir: Path) -> dict:
    """Export all tables from the active SQLAlchemy engine (Postgres or SQLite) to JSON."""
    insp = inspect(engine)
    tables = insp.get_table_names()
    dump = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "dialect": engine.dialect.name,
        "tables": {},
        "row_counts": {},
    }
    with engine.connect() as conn:
        for tbl in tables:
            rows = conn.execute(text(f'SELECT * FROM "{tbl}"')).mappings().all()
            serialized = []
            for r in rows:
                item = {}
                for k, v in dict(r).items():
                    if hasattr(v, "isoformat"):
                        item[k] = v.isoformat()
                    else:
                        item[k] = v
                serialized.append(item)
            dump["tables"][tbl] = serialized
            dump["row_counts"][tbl] = len(serialized)

    out_file = target_dir / f"active_db_{engine.dialect.name}_dump.json"
    out_file.write_text(json.dumps(dump, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "file": str(out_file),
        "dialect": engine.dialect.name,
        "tables": dump["row_counts"],
    }


def backup_sqlite_files(target_dir: Path) -> list:
    """Atomically backup all local SQLite .db files and generate .sql dumps."""
    candidates = [
        Path(r"d:\interview-ai\oraliq-elsawy\backend\interview_ai.db"),
        Path(r"d:\interview-ai\oraliq-elsawy\backend\data\interview_ai.db"),
        Path(r"d:\interview-ai\interview_ai.db"),
    ]
    results = []
    for idx, db_path in enumerate(candidates):
        if not db_path.exists():
            continue
        label = f"{idx + 1}_{db_path.parent.name}_{db_path.name}"
        dst_db = target_dir / label
        dst_sql = target_dir / f"{label}.sql"

        src_conn = sqlite3.connect(str(db_path))
        dst_conn = sqlite3.connect(str(dst_db))
        with dst_conn:
            src_conn.backup(dst_conn)
        dst_conn.close()

        with open(dst_sql, "w", encoding="utf-8") as f:
            for line in src_conn.iterdump():
                f.write(f"{line}\n")
        src_conn.close()

        results.append({
            "source": str(db_path),
            "backup_db": str(dst_db),
            "backup_sql": str(dst_sql),
            "size_bytes": dst_db.stat().st_size,
        })
    return results


if __name__ == "__main__":
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    active_info = backup_active_sqlalchemy_db(BACKUP_DIR)
    sqlite_info = backup_sqlite_files(BACKUP_DIR)

    # Also update a 'latest' pointer copy
    latest_dir = BACKUP_ROOT / "latest"
    if latest_dir.exists():
        shutil.rmtree(latest_dir)
    shutil.copytree(BACKUP_DIR, latest_dir)

    manifest = {
        "backup_dir": str(BACKUP_DIR),
        "latest_dir": str(latest_dir),
        "active_database": active_info,
        "sqlite_files": sqlite_info,
    }
    (BACKUP_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))
