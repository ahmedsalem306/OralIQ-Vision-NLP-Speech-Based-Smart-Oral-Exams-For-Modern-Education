from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.api_router import api_router
from app.core.database import engine, Base, ensure_migrations
from app.models.user import User  # noqa: F401 — ensures all models are registered
import hashlib
import os
import time
import threading
from collections import OrderedDict


# ══════════════════════════════════════════════════════════════════════════════
# High-Concurrency Thread-Safe Bounded Rate Limiter
# - Uses an OrderedDict with LRU eviction (max_buckets=50,000) so memory stays
#   strictly bounded even under a multi-million-IP DDoS flood.
# - Separate strict brute-force limiter for authentication endpoints.
# ══════════════════════════════════════════════════════════════════════════════
class RateLimiter:
    """Thread-safe sliding-window rate limiter with bounded memory."""
    def __init__(self, limit: int = 100, window: int = 60, max_buckets: int = 50_000):
        self.limit = limit
        self.window = window
        self.max_buckets = max_buckets
        self._hits: OrderedDict[str, list[float]] = OrderedDict()
        self._lock = threading.Lock()
        self._last_prune = 0.0

    def _prune_unlocked(self, now: float) -> None:
        if now - self._last_prune < self.window:
            return
        self._last_prune = now
        cutoff = now - self.window
        expired_keys = [k for k, hits in self._hits.items() if not hits or hits[-1] < cutoff]
        for k in expired_keys:
            del self._hits[k]

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            self._prune_unlocked(now)
            hits = self._hits.get(key)
            if hits is not None:
                valid = [t for t in hits if t > cutoff]
                if len(valid) >= self.limit:
                    self._hits[key] = valid
                    self._hits.move_to_end(key)
                    return False
                valid.append(now)
                self._hits[key] = valid
                self._hits.move_to_end(key)
                return True
            else:
                if len(self._hits) >= self.max_buckets:
                    self._hits.popitem(last=False)
                self._hits[key] = [now]
                return True


RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MIN", "300"))
AUTH_RATE_LIMIT = int(os.environ.get("AUTH_RATE_LIMIT_PER_MIN", "20"))
rate_limiter = RateLimiter(limit=RATE_LIMIT, window=60, max_buckets=50_000)
auth_rate_limiter = RateLimiter(limit=AUTH_RATE_LIMIT, window=60, max_buckets=50_000)

TRUST_PROXY = os.environ.get("TRUST_PROXY", "").strip().lower() in ("1", "true", "yes")


# ══════════════════════════════════════════════════════════════════════════════
# Security Headers Middleware
# ══════════════════════════════════════════════════════════════════════════════
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, max-age=0"
        return response


# ══════════════════════════════════════════════════════════════════════════════
# Rate Limit Middleware
# ══════════════════════════════════════════════════════════════════════════════
def _client_ip(request: Request) -> str:
    if TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token:
            return "s:" + hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
    return "ip:" + _client_ip(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in ("/", "/health", "/debug"):
            return await call_next(request)

        # Strict brute-force rate limit on login & registration endpoints (per IP)
        if path in ("/api/v1/login/access-token", "/api/v1/register"):
            ip_key = "auth:" + _client_ip(request)
            if not auth_rate_limiter.is_allowed(ip_key):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many authentication attempts. Please wait a minute."},
                    headers={"Retry-After": "60"},
                )

        if not rate_limiter.is_allowed(_rate_limit_key(request)):
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
        if content_length:
            try:
                if int(content_length) > MAX_BODY_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large. Maximum is 50MB."},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
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

    try:
        from app.services.speech_ai import speech_analyzer
        _ = speech_analyzer.model
    except Exception as e:
        print(f"[Startup] Whisper pre-load failed (will retry on first request): {e}")

    try:
        from app.services.nlp_ai import nlp_analyzer
        _ = nlp_analyzer.model
    except Exception as e:
        print(f"[Startup] SBERT pre-load failed (will retry on first request): {e}")

    try:
        from app.services.voice_ai import voice_service
        _ = voice_service.encoder
        status = voice_service.get_status()
        print(f"[Startup] Voice biometrics: {status['engine']} ({'ready' if status['ready'] else 'fallback'})")
    except Exception as e:
        print(f"[Startup] VoiceEncoder pre-load failed (will retry on first request): {e}")

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


def _allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    is_dev = os.environ.get("ENV", "dev") == "dev"

    if not raw:
        if is_dev:
            return ["*"]
        raise RuntimeError(
            "ALLOWED_ORIGINS is not set. List the sites that may call this API, comma separated:\n"
            '  ALLOWED_ORIGINS="https://oraliq.com,https://www.oraliq.com"'
        )

    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if "*" in origins and not is_dev:
        raise RuntimeError(
            'ALLOWED_ORIGINS is "*", which allows every site on the internet. '
            "Name the real origins instead."
        )
    return origins


ALLOWED_ORIGINS = _allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    max_age=600,
)


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/")
def read_root():
    return {"message": "OralIQ API v2.0 🚀", "status": "operational"}


@app.get("/debug")
def debug_info():
    if os.environ.get("ENV", "dev") != "dev":
        raise HTTPException(status_code=404, detail="Not Found")

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

    url = os.environ.get("DATABASE_URL")
    return {
        "database": (url.split("://", 1)[0] if url and "://" in url else "sqlite (local)"),
        "db_writable": db_writable,
        "stt_ready": stt_ready,
        "nlp_ready": nlp_ready,
        "rate_limit": f"{rate_limiter.limit}/min",
        "auth_rate_limit": f"{auth_rate_limiter.limit}/min",
        "max_upload": f"{MAX_BODY_SIZE // (1024*1024)}MB",
    }


@app.get("/health")
def health_check():
    """Fast, lock-free health check — does not run DDL migrations on the hot path."""
    from app.services.speech_ai import speech_analyzer
    from app.services.nlp_ai import nlp_analyzer
    from app.services.face_ai import face_analyzer
    from app.services.voice_ai import voice_service
    from app.services.face_biometrics import EMBEDDING_DIM, face_biometrics_service
    from app.services.gaze_ai import gaze_ai_service

    voice_status = voice_service.get_status()
    face_status = face_biometrics_service.get_status()
    gaze_status = gaze_ai_service.get_status()

    return {
        "status": "ok",
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
    is_dev = os.environ.get("ENV", "dev") == "dev"
    content = {"detail": str(exc) if is_dev else "Internal server error"}
    if is_dev:
        content["traceback"] = traceback.format_exc()
        content["type"] = type(exc).__name__
    return JSONResponse(status_code=500, content=content)


# Start background model preloading after the app is fully configured
_preload_thread = threading.Thread(target=_preload_models, daemon=True)
_preload_thread.start()
