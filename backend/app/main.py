from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.api_router import api_router
from app.core.database import engine, Base, ensure_migrations, _column_exists
from app.models.user import User  # noqa: F401 — ensures all models are registered
import os
import time
import threading
from collections import defaultdict


# ══════════════════════════════════════════════════════════════════════════════
# Rate Limiter — in-memory (per IP), suitable for single-server deployments.
# For multi-server: swap to Redis-backed (e.g. slowapi).
# ══════════════════════════════════════════════════════════════════════════════
class RateLimiter:
    """Simple sliding-window rate limiter: max `limit` requests per `window` seconds."""
    def __init__(self, limit: int = 100, window: int = 60):
        self.limit = limit
        self.window = window
        self._hits: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        hits = self._hits[key]
        # Remove expired entries
        self._hits[key] = [t for t in hits if now - t < self.window]
        if len(self._hits[key]) >= self.limit:
            return False
        self._hits[key].append(now)
        return True


rate_limiter = RateLimiter(limit=120, window=60)  # 120 req/min per IP


# ══════════════════════════════════════════════════════════════════════════════
# Security Headers Middleware
# ══════════════════════════════════════════════════════════════════════════════
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self)"
        return response


# ══════════════════════════════════════════════════════════════════════════════
# Rate Limit Middleware
# ══════════════════════════════════════════════════════════════════════════════
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health/debug endpoints
        if request.url.path in ("/", "/health", "/debug"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        if not rate_limiter.is_allowed(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": "60"},
            )
        return await call_next(request)


# ══════════════════════════════════════════════════════════════════════════════
# Request Size Limit Middleware (prevent abuse with huge uploads)
# ══════════════════════════════════════════════════════════════════════════════
MAX_BODY_SIZE = 50 * 1024 * 1024  # 50MB max (exam recordings can be large)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum is 50MB."},
            )
        return await call_next(request)


# ══════════════════════════════════════════════════════════════════════════════
# Background model preloading
# ══════════════════════════════════════════════════════════════════════════════
def _preload_models():
    """Background thread: pre-load AI models so they're ready for first request."""
    print("\n" + "=" * 50)
    print("[Startup] Pre-loading AI models in background...")
    print("=" * 50)

    # 1. Whisper (Speech AI)
    try:
        from app.services.speech_ai import speech_analyzer
        _ = speech_analyzer.model  # triggers lazy load
    except Exception as e:
        print(f"[Startup] Whisper pre-load failed (will retry on first request): {e}")

    # 2. SBERT (NLP AI)
    try:
        from app.services.nlp_ai import nlp_analyzer
        _ = nlp_analyzer.model  # triggers lazy load
    except Exception as e:
        print(f"[Startup] SBERT pre-load failed (will retry on first request): {e}")

    # 3. VoiceEncoder (Speaker biometrics / deep learning)
    try:
        from app.services.voice_ai import voice_service
        _ = voice_service.encoder  # triggers load if not already done
        status = voice_service.get_status()
        print(f"[Startup] Voice biometrics: {status['engine']} ({'ready' if status['ready'] else 'fallback'})")
    except Exception as e:
        print(f"[Startup] VoiceEncoder pre-load failed (will retry on first request): {e}")

    # 4. InsightFace (Face ID) + MobileGaze
    try:
        from app.services.face_biometrics import face_biometrics_service
        face_biometrics_service._ensure_app()
        print(f"[Startup] Face ID: {face_biometrics_service.get_status()}")
    except Exception as e:
        print(f"[Startup] InsightFace pre-load failed (will retry on first request): {e}")

    try:
        from app.services.gaze_ai import gaze_ai_service
        gaze_ai_service._ensure_session()
        print(f"[Startup] Gaze: {gaze_ai_service.get_status()}")
    except Exception as e:
        print(f"[Startup] MobileGaze pre-load failed (will retry on first request): {e}")

    print("=" * 50)
    print("[Startup] AI model pre-loading complete!")
    print("=" * 50 + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# Application Factory
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="OralIQ API",
    description="Production-grade backend for OralIQ Smart Oral Exams",
    version="2.0.0",
    on_startup=[lambda: (Base.metadata.create_all(bind=engine), ensure_migrations())],
    docs_url="/docs" if os.environ.get("ENV", "dev") == "dev" else None,
    redoc_url=None,
)

# ── Middleware Stack (order matters: last added = first executed) ──
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

# ── CORS ──
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,  # cache preflight for 10min
)


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/")
def read_root():
    return {"message": "OralIQ API v2.0 🚀", "status": "operational"}


@app.get("/debug")
def debug_info():
    """Debug endpoint — shows database and environment info."""
    from sqlalchemy import text
    from app.core.database import SessionLocal

    db_writable = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_writable = True
    except Exception:
        pass

    try:
        from app.services.speech_ai import speech_analyzer
        from app.services.nlp_ai import nlp_analyzer
        stt_ready = speech_analyzer.is_ready()
        nlp_ready = nlp_analyzer.is_ready()
    except Exception:
        stt_ready = "error"
        nlp_ready = "error"

    return {
        "database_url": os.environ.get("DATABASE_URL", "sqlite (local)"),
        "db_writable": db_writable,
        "stt_ready": stt_ready,
        "nlp_ready": nlp_ready,
        "rate_limit": f"{rate_limiter.limit}/min",
        "max_upload": f"{MAX_BODY_SIZE // (1024*1024)}MB",
    }


@app.get("/health")
def health_check():
    """Health check — shows which AI models are loaded and ready."""
    from app.services.speech_ai import speech_analyzer
    from app.services.nlp_ai import nlp_analyzer
    from app.services.face_ai import face_analyzer
    from app.services.voice_ai import voice_service
    from app.services.face_biometrics import EMBEDDING_DIM, face_biometrics_service
    from app.services.gaze_ai import gaze_ai_service

    voice_status = voice_service.get_status()
    face_status = face_biometrics_service.get_status()
    gaze_status = gaze_ai_service.get_status()
    mig = ensure_migrations()

    return {
        "status": "ok",
        "database": {
            "face_embedding_column": _column_exists("users", "face_embedding"),
            "migration": mig,
        },
        "models": {
            "whisper": "ready" if speech_analyzer.is_ready() else "not_loaded",
            "sbert": "ready" if nlp_analyzer.is_ready() else "not_loaded",
            "anti_cheat": "ready",
            "voice_biometrics": "ready" if voice_status["ready"] else voice_status["engine"],
            "face_id": "ready" if face_status.get("ready") else ("error" if face_status.get("error") else "lazy"),
            "gaze": "ready" if gaze_status.get("ready") else ("error" if gaze_status.get("error") else "lazy"),
        },
        "config": {
            "whisper_model": speech_analyzer.MODEL_SIZE,
            "anti_cheat_alerts": list(face_analyzer.ALERT_WEIGHTS.keys()),
            "voice_engine": voice_status["engine"],
            "voice_embedding_dim": voice_status["embedding_dim"],
            "face_embedding_dim": EMBEDDING_DIM,
            "face_engine": face_status.get("engine"),
            "gaze_engine": gaze_status.get("engine"),
        },
    }


# ── API Router ──
app.include_router(api_router, prefix="/api/v1")

# ── Exception Handlers ──
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"[500 ERROR] {request.method} {request.url.path}")
    print(traceback.format_exc())
    # In production, don't expose traceback
    is_dev = os.environ.get("ENV", "dev") == "dev"
    content = {"detail": str(exc)}
    if is_dev:
        content["traceback"] = traceback.format_exc()
        content["type"] = type(exc).__name__
    return JSONResponse(status_code=500, content=content)


# Start background model preloading after the app is fully configured
_preload_thread = threading.Thread(target=_preload_models, daemon=True)
_preload_thread.start()
