import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings


MIN_SECRET_LENGTH = 32


def _get_or_create_secret() -> str:
    """
    Returns the key that signs every access token.

    Outside development it must come from the environment, and the process refuses to start
    without it. A container has no persistent disk by default, so the old "generate and save to
    data/.secret_key" fallback produced a *new* key on every restart: every token issued before
    the restart stopped verifying, and every signed-in user — mid-exam included — was logged out
    with no error anyone could trace. In development the file fallback is still the convenience
    it was meant to be.
    """
    env_key = (os.environ.get("SECRET_KEY") or "").strip()
    is_dev = os.environ.get("ENV", "dev") == "dev"

    if env_key:
        if len(env_key) < MIN_SECRET_LENGTH:
            raise RuntimeError(
                f"SECRET_KEY is only {len(env_key)} characters; it must be at least "
                f"{MIN_SECRET_LENGTH}. Generate one with: python -c "
                '"import secrets; print(secrets.token_urlsafe(64))"'
            )
        return env_key

    if not is_dev:
        raise RuntimeError(
            "SECRET_KEY is not set. Set it in the environment before starting the server:\n"
            '  SECRET_KEY="$(python -c \'import secrets; print(secrets.token_urlsafe(64))\')"\n'
            "Keep the same value across restarts and across every instance, or all sessions "
            "will be dropped whenever the server restarts."
        )

    # Development only, from here down.
    key_file = Path(__file__).resolve().parents[2] / "data" / ".secret_key"
    if key_file.exists():
        stored = key_file.read_text().strip()
        if len(stored) >= MIN_SECRET_LENGTH:
            return stored

    new_key = secrets.token_urlsafe(64)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_text(new_key)
    print(f"[Config] Development SECRET_KEY generated -> {key_file}")
    return new_key


class Settings(BaseSettings):
    PROJECT_NAME: str = "OralIQ"
    API_V1_STR: str = "/api/v1"

    # Security — persistent key (survives restarts)
    SECRET_KEY: str = _get_or_create_secret()
    ALGORITHM: str = "HS256"

    # Token expiry — long enough for exam sessions
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Password hashing rounds (bcrypt)
    BCRYPT_ROUNDS: int = 12

    # Environment
    ENV: str = os.environ.get("ENV", "dev")

    class Config:
        env_file = ".env"


settings = Settings()
