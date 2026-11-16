"""Bounded Groq STT; existing local fluency/content grading consumes its evidence."""
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from io import BytesIO
import json
import math
import os
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
import uuid
import wave

import numpy as np

from app.core.speech_config import SpeechProviderDeferred, SpeechProviderError, groq_key, groq_settings
from app.services import speech_budget

ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def _opener():
    return build_opener(ProxyHandler({}), _NoRedirect())


def _retry_after(raw):
    try:
        seconds = float(raw)
        if not math.isfinite(seconds):
            raise ValueError
    except (TypeError, ValueError):
        try:
            seconds = (parsedate_to_datetime(raw).astimezone(timezone.utc) - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            seconds = 60
    return max(1, min(86400, math.ceil(seconds)))


def _multipart(waveform, model, hint, word_timestamps):
    data = BytesIO()
    with wave.open(data, 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes((np.clip(waveform, -1, 1) * 32767).astype('<i2').tobytes())
    if data.tell() > 25 * 1024 ** 2:
        raise SpeechProviderError('groq_audio_too_large')
    fields = [('model', model), ('temperature', '0'), ('response_format', 'verbose_json')]
    language = os.environ.get('WHISPER_LANGUAGE', '').strip()
    if language:
        fields.append(('language', language))
    if hint:
        fields.append(('prompt', hint.strip()[:200]))
    if word_timestamps:
        fields.extend([('timestamp_granularities[]', 'word'), ('timestamp_granularities[]', 'segment')])
    boundary = 'oraliq-' + uuid.uuid4().hex
    chunks = [(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n').encode()
              for name, value in fields]
    chunks.extend([(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="answer.wav"\r\n'
                    'Content-Type: audio/wav\r\n\r\n').encode(), data.getvalue(), f'\r\n--{boundary}--\r\n'.encode()])
    return b''.join(chunks), f'multipart/form-data; boundary={boundary}'


def _normalize(payload, duration, word_timestamps):
    if not isinstance(payload, dict) or not isinstance(payload.get('text'), str) or len(payload['text']) > 50000:
        raise SpeechProviderError('groq_invalid_transcript')
    text = payload['text'].strip()
    if not text:
        return '', [], SimpleNamespace(language=payload.get('language'))
    if not word_timestamps:
        return text, [], SimpleNamespace(language=payload.get('language'))
    words = payload.get('words')
    if not isinstance(words, list) or not words or len(words) > 10000:
        raise SpeechProviderError('groq_missing_word_timestamps')
    converted, previous = [], 0
    for word in words:
        if not isinstance(word, dict):
            raise SpeechProviderError('groq_invalid_word_timestamps')
        start, end = word.get('start'), word.get('end')
        if (not isinstance(start, (int, float)) or not isinstance(end, (int, float))
                or not math.isfinite(start) or not math.isfinite(end)
                or not previous <= start <= end <= duration + 2 or not isinstance(word.get('word'), str)):
            raise SpeechProviderError('groq_invalid_word_timestamps')
        converted.append(SimpleNamespace(word=word['word'], start=float(start), end=float(end)))
        previous = start
    # Fluency flattens words across segments and uses the outer speech bounds.
    segment = SimpleNamespace(text=text, start=converted[0].start, end=max(w.end for w in converted), words=converted)
    if segment.end <= segment.start:
        raise SpeechProviderError('groq_invalid_speech_duration')
    return text, [segment], SimpleNamespace(language=payload.get('language'))


def transcribe(waveform, hint='', word_timestamps=False):
    settings, key = groq_settings(), groq_key()
    duration = len(waveform) / 16000
    if not 0 < duration <= 600 or not np.isfinite(waveform).all():
        raise SpeechProviderError('groq_invalid_audio')
    body, content_type = _multipart(waveform, settings.model, hint, word_timestamps)
    speech_budget.reserve(duration)
    request = Request(ENDPOINT, data=body, headers={
        'Authorization': 'Bearer ' + key, 'Content-Type': content_type, 'User-Agent': 'OralIQ/1.0',
    }, method='POST')
    try:
        with _opener().open(request, timeout=settings.timeout) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise SpeechProviderError('groq_response_too_large')
            if response.status != 200:
                raise SpeechProviderError('groq_unexpected_http_status')
            payload = json.loads(raw)
    except HTTPError as error:
        code, delay = error.code, _retry_after(error.headers.get('Retry-After'))
        spend_blocked = False
        try:
            # A spending cap is a temporary provider wait, not an invalid answer.
            # Inspect only a bounded error code; never log provider bodies or keys.
            if code == 400:
                raw_error = error.read(4097)
                if len(raw_error) <= 4096:
                    payload = json.loads(raw_error)
                    detail = payload.get('error') if isinstance(payload, dict) else None
                    spend_blocked = isinstance(detail, dict) and detail.get('code') == 'blocked_api_access'
        except (ValueError, OSError):
            pass
        finally:
            error.close()
        if spend_blocked:
            speech_budget.block_for(900)
            raise SpeechProviderDeferred('groq_spend_limit', 900) from None
        if code == 429:
            speech_budget.block_for(delay)
            raise SpeechProviderDeferred('groq_rate_limit', delay) from None
        if code in (401, 403):
            speech_budget.block_for(3600)
            raise SpeechProviderDeferred('groq_credentials', 3600) from None
        raise SpeechProviderError(f'groq_http_{code}') from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise SpeechProviderError('groq_transport_or_response_error') from None
    return _normalize(payload, duration, word_timestamps)
