import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings


def _get_or_create_secret() -> str:
    """
    Returns a persistent secret key.
    Priority: ENV variable > .secret_key file > generate & save new one.
    This ensures tokens survive server restarts.
    """
    # 1. Check environment variable first
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key

    # 2. Check for saved key file
    key_file = Path(__file__).resolve().parents[2] / "data" / ".secret_key"
    if key_file.exists():
        stored = key_file.read_text().strip()
        if len(stored) > 20:
            return stored

    # 3. Generate new key and save it
    new_key = secrets.token_urlsafe(64)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_text(new_key)
    print(f"[Config] Generated new SECRET_KEY -> saved to {key_file}")
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
