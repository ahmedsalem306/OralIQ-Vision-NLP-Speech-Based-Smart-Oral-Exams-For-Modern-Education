import sqlite3
import os

db_path = "interview_ai.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, student_name, started_at, submitted_at FROM exam_submissions ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    print("Latest Submissions:")
    for row in rows:
        print(f"ID: {row[0]}, Student: {row[1]}, Started: {row[2]}, Submitted: {row[3]}")
    conn.close()
