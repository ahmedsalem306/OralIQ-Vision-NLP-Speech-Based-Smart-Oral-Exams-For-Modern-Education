"""Create disposable load fixtures in a PostgreSQL database named *_loadtest only."""
import argparse
from datetime import timedelta
import json
import math
import os
from pathlib import Path
import secrets
import uuid

from scripts.school_load_test import Config


def require_load_database(url):
    from sqlalchemy.engine import make_url
    parsed = make_url(url)
    if parsed.get_backend_name() != "postgresql" or not (parsed.database or "").endswith("_loadtest"):
        raise ValueError("Fixtures require a separate PostgreSQL database whose name ends with _loadtest")


def valid_embedding(raw, dimension):
    try:
        values = json.loads(raw)
        return isinstance(values, list) and len(values) == dimension and all(
            type(value) in (int, float) and math.isfinite(value) for value in values) and sum(v*v for v in values) > 1e-12
    except (TypeError, ValueError):
        return False


def prepare(db, base_url, students=500, questions=2, minutes=3, identity_email=None):
    from app.core import security
    from app.models.user import User
    from app.models.question import Question
    prefix = "load-" + uuid.uuid4().hex[:12]
    password = secrets.token_urlsafe(24)
    hashed = security.get_password_hash(password)
    owner = User(email=f"{prefix}-lecturer@loadtest.invalid", full_name="Load-test lecturer", role="lecturer",
                 hashed_password=hashed, email_verified=True, requires_email_verification=False,
                 plan_tier="enterprise", custom_max_students=students, custom_max_exams=100,
                 is_active=True)
    admin = User(email=f"{prefix}-metrics@loadtest.invalid", full_name="Load-test metrics", role="admin",
                 hashed_password=hashed, email_verified=True, requires_email_verification=False, is_active=True)
    face = voice = None
    if identity_email:
        if not identity_email.endswith("@loadtest.invalid"):
            raise ValueError("Only a consenting, enrolled loadtest.invalid fixture identity may be copied")
        identity = db.query(User).filter(User.email == identity_email, User.role == "student").first()
        if not identity or not valid_embedding(identity.face_embedding, 512) or not valid_embedding(identity.voice_embedding, 256):
            raise ValueError("The staging identity needs real InsightFace and Resemblyzer enrollment first")
        face, voice = identity.face_embedding, identity.voice_embedding
    db.add_all([owner, admin])
    db.flush()
    exam = []
    for index in range(questions):
        question = Question(text=f"سؤال تجريبي {index + 1}: اشرح الفكرة الأساسية مع مثال.",
                            model_answer="شرح الفكرة الأساسية بصورة واضحة مع مثال صحيح.",
                            duration_minutes=minutes, creator_id=owner.id, order_index=index,
                            max_attempts=1, results_policy="immediate", category="اختبار ضغط — بيانات تجريبية")
        db.add(question)
        db.flush()
        question.group_token = exam[0].exam_token if exam else question.exam_token
        exam.append(question)
    accounts = []
    for index in range(students):
        user = User(email=f"{prefix}-student-{index + 1:04d}@loadtest.invalid", full_name=f"Load student {index + 1}",
                    role="student", hashed_password=hashed, email_verified=True, requires_email_verification=False,
                    face_embedding=face, voice_embedding=voice, face_locked=bool(face), voice_locked=bool(voice),
                    is_active=True)
        db.add(user)
        db.flush()
        accounts.append({"id": user.id, "email": user.email, "password": password,
                         "token": security.create_access_token(user.id, timedelta(days=1))})
    result = {"schema_version": 1, "run_id": prefix, "allowed_origin": base_url.rstrip("/"),
              "database_kind": "postgresql", "biometric_mode": "real" if identity_email else "scaffold_unenrolled",
              "lecturer": {"id": owner.id, "email": owner.email,
                           "token": security.create_access_token(owner.id, timedelta(days=1))},
              "metrics_admin": {"token": security.create_access_token(admin.id, timedelta(days=1))},
              "exam": {"key": exam[0].exam_token, "question_ids": [q.id for q in exam],
                       "question_seconds": minutes * 60}, "students": accounts}
    db.commit()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--students", type=int, default=500)
    parser.add_argument("--questions", type=int, default=2)
    parser.add_argument("--minutes", type=int, default=3)
    parser.add_argument("--identity-user-email")
    parser.add_argument("--output", required=True)
    parser.add_argument("--confirm-staging", action="store_true", required=True)
    args = parser.parse_args()
    Config(args.base_url, students=args.students, questions=args.questions, question_seconds=args.minutes * 60).validate()
    if os.environ.get("LOAD_TEST_ENABLED") != "1":
        parser.error("Set LOAD_TEST_ENABLED=1 only in the isolated load-test environment")
    require_load_database(os.environ.get("DATABASE_URL", ""))
    output = Path(args.output)
    if output.exists():
        parser.error("Output exists; use a fresh private fixture filename")
    output.parent.mkdir(parents=True, exist_ok=True)
    import app.models  # register models only after the explicit staging checks
    from app.core.database import Base, engine, ensure_migrations, SessionLocal
    Base.metadata.create_all(engine)
    if not ensure_migrations().get("ok"):
        raise RuntimeError("Staging schema migration failed")
    with SessionLocal() as db:
        manifest = prepare(db, args.base_url, args.students, args.questions, args.minutes, args.identity_user_email)
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"created_students": len(manifest["students"]), "questions": args.questions,
                      "biometric_mode": manifest["biometric_mode"], "credentials_written_to": str(output)}))


if __name__ == "__main__":
    main()
