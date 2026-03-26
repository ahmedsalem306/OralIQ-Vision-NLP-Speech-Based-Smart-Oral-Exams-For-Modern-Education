from app.core.database import SessionLocal
from app.models.exam_submission import ExamSubmission
from sqlalchemy import desc

db = SessionLocal()
subs = db.query(ExamSubmission).order_by(desc(ExamSubmission.id)).limit(5).all()
for s in subs:
    print(f"ID: {s.id}, Student: {s.student_name}, Started: {s.started_at}, Submitted: {s.submitted_at}")
db.close()
