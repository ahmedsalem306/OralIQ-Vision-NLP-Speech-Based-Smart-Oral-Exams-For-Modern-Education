from app.core.database import SessionLocal
from app.models.exam_submission import ExamSubmission
from sqlalchemy import desc

db = SessionLocal()
results = db.query(ExamSubmission).order_by(desc(ExamSubmission.id)).limit(10).all()

for r in results:
    print(f"ID: {r.id}, Student: {r.student_name}, Started: {r.started_at}, Submitted: {r.submitted_at}")

db.close()
