import sqlite3
import os

db_path = "interview_ai.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add started_at to exam_submissions (already done, but let's be safe)
    try:
        cursor.execute("ALTER TABLE exam_submissions ADD COLUMN started_at DATETIME")
        print("Successfully added started_at column to exam_submissions")
    except sqlite3.OperationalError:
        print("started_at already exists in exam_submissions")
        
    # 2. Add duration_minutes to questions
    try:
        cursor.execute("ALTER TABLE questions ADD COLUMN duration_minutes INTEGER DEFAULT 2")
        print("Successfully added duration_minutes column to questions")
    except sqlite3.OperationalError:
        print("duration_minutes already exists in questions")
    
    # 3. Add finished_at to exam_submissions
    try:
        cursor.execute("ALTER TABLE exam_submissions ADD COLUMN finished_at DATETIME")
        print("Successfully added finished_at column to exam_submissions")
    except sqlite3.OperationalError:
        print("finished_at already exists in exam_submissions")
    
    conn.commit()
    conn.close()
