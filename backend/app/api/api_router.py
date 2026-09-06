from fastapi import APIRouter
from app.api.endpoints import auth, questions, interviews, users, exams, voice

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(voice.router, prefix="/voice", tags=["voice"])

