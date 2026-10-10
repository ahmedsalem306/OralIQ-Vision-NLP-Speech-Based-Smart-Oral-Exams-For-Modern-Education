"""System maintenance endpoints (migrations, schema checks)."""
from fastapi import APIRouter
from app.core.database import ensure_migrations, _column_exists, engine

router = APIRouter()


@router.get("/db-migrate")
def run_db_migrate() -> dict:
    """
    Apply pending DB schema patches (idempotent).
    Open once after deploy if registration fails with missing face_embedding column.
    """
    result = ensure_migrations()
    return {
        **result,
        "columns": {
            "face_embedding": _column_exists("users", "face_embedding"),
            "face_locked": _column_exists("users", "face_locked"),
            "face_score": _column_exists("exam_submissions", "face_score"),
        },
        "dialect": engine.dialect.name,
    }
