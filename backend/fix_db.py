from app.core.database import engine, Base
from app.models.question import Question
from app.models.exam_assignment import ExamAssignment
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    with engine.connect() as conn:
        logger.info("Dropping table exam_assignments")
        conn.execute(text("DROP TABLE IF EXISTS exam_assignments"))
        logger.info("Dropping table questions")
        conn.execute(text("DROP TABLE IF EXISTS questions"))
        conn.commit()

    logger.info("Recreating all tables")
    Base.metadata.create_all(bind=engine)
    logger.info("Schema fixed!")

if __name__ == "__main__":
    migrate()
