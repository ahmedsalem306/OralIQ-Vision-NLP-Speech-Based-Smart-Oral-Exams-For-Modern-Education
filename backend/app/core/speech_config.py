"""Explicit speech-provider selection; local inference remains the default."""
from dataclasses import dataclass
import os
from pathlib import Path
import re


class SpeechProviderError(RuntimeError):
    """Redacted provider failure: never include HTTP headers/body or credentials."""


class SpeechProviderDeferred(SpeechProviderError):
    def __init__(self, reason: str, retry_after: int):
        self.reason = reason if reason in ('groq_budget', 'groq_cooldown', 'groq_rate_limit', 'groq_credentials') else 'provider_busy'
        self.retry_after = max(1, min(86400, int(retry_after)))
        super().__init__(f"speech_provider_wait:{self.reason}")


def provider_name():
    value = os.environ.get('SPEECH_PROVIDER', 'local').strip().lower()
    if value not in ('local', 'groq'):
        raise SpeechProviderError('SPEECH_PROVIDER must be local or groq')
    return value


def _integer(name, default, minimum, maximum):
    value = os.environ.get(name, str(default)).strip()
    if not value.isdigit() or not minimum <= int(value) <= maximum:
        raise SpeechProviderError(f'{name} must be an integer between {minimum} and {maximum}')
    return int(value)


@dataclass(frozen=True)
class GroqSettings:
    model: str
    rpm: int
    rpd: int
    audio_hour: int
    audio_day: int
    timeout: int


def groq_settings():
    model = os.environ.get('GROQ_SPEECH_MODEL', 'whisper-large-v3').strip()
    if model not in ('whisper-large-v3', 'whisper-large-v3-turbo'):
        raise SpeechProviderError('GROQ_SPEECH_MODEL is unsupported')
    return GroqSettings(
        model=model,
        rpm=_integer('GROQ_REQUESTS_PER_MINUTE', 18, 1, 10000),
        rpd=_integer('GROQ_REQUESTS_PER_DAY', 1800, 1, 1000000),
        audio_hour=_integer('GROQ_AUDIO_SECONDS_PER_HOUR', 6480, 10, 3600000),
        audio_day=_integer('GROQ_AUDIO_SECONDS_PER_DAY', 25920, 10, 86400000),
        timeout=_integer('GROQ_TIMEOUT_SECONDS', 60, 1, 90),
    )


def groq_key():
    filename = os.environ.get('GROQ_API_KEY_FILE', '').strip()
    if filename:
        try:
            path = Path(filename)
            if path.stat().st_size > 256 or (os.name != 'nt' and path.stat().st_mode & 0o077):
                raise SpeechProviderError('GROQ_API_KEY_FILE must be private and bounded')
            value = path.read_text(encoding='utf-8-sig').strip()
        except (OSError, UnicodeError):
            raise SpeechProviderError('GROQ_API_KEY_FILE cannot be read') from None
    else:
        value = os.environ.get('GROQ_API_KEY', '').strip()
    if not re.fullmatch(r'gsk_[A-Za-z0-9_-]{20,200}', value):
        raise SpeechProviderError('Groq speech requires a valid private API key')
    return value


def speech_config_problems():
    try:
        if provider_name() == 'groq':
            groq_settings()
            groq_key()
    except SpeechProviderError as error:
        return [str(error)]
    return []
