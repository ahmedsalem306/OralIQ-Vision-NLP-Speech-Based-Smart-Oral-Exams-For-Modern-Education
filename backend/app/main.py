import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_router import api_router
from app.core.database import engine, Base
import app.models  # noqa: F401 — ensures all models are registered


def _preload_models():
    """Background thread: pre-load AI models so they're ready for first request."""
    print("\n" + "=" * 50)
    print("[Startup] 🔄 Pre-loading AI models in background...")
    print("=" * 50)

    # 1. Whisper (Speech AI)
    try:
        from app.services.speech_ai import speech_analyzer
        _ = speech_analyzer.model  # triggers lazy load
    except Exception as e:
        print(f"[Startup] ⚠️ Whisper pre-load failed (will retry on first request): {e}")

    # 2. SBERT (NLP AI)
    try:
        from app.services.nlp_ai import nlp_analyzer
        _ = nlp_analyzer.model  # triggers lazy load
    except Exception as e:
        print(f"[Startup] ⚠️ SBERT pre-load failed (will retry on first request): {e}")

    print("=" * 50)
    print("[Startup] ✅ AI model pre-loading complete!")
    print("=" * 50 + "\n")


app = FastAPI(
    title="Interview AI API",
    description="Backend for the Mock Interview AI System",
    version="1.0.0",
    on_startup=[lambda: Base.metadata.create_all(bind=engine)],
)

# CORS Configuration
# For production, we will add the Vercel URL once provided.
# For now, we'll allow all origins to test the connection.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Interview AI System API 🚀"}


@app.get("/debug")
def debug_info():
    """Debug endpoint — shows database and environment info."""
    import os
    from app.core.database import DATABASE_URL, engine
    try:
        with engine.connect() as conn:
            db_ok = True
    except Exception as e:
        db_ok = str(e)

    return {
        "database_url": DATABASE_URL,
        "db_writable": db_ok,
        "tmp_writable": os.access("/tmp", os.W_OK),
        "cwd": os.getcwd(),
    }


@app.get("/health")
def health_check():
    """Health check — shows which AI models are loaded and ready."""
    from app.services.speech_ai import speech_analyzer
    from app.services.nlp_ai import nlp_analyzer

    return {
        "status": "ok",
        "models": {
            "whisper": "ready" if speech_analyzer.is_ready() else "not_loaded",
            "sbert": "ready" if nlp_analyzer.is_ready() else "not_loaded",
        },
    }


app.include_router(api_router, prefix="/api/v1")

# Start background model preloading after the app is fully configured
_preload_thread = threading.Thread(target=_preload_models, daemon=True)
_preload_thread.start()
