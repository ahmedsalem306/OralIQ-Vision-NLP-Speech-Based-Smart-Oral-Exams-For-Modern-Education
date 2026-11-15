"""Small, explicitly authorized Groq audio probe; never switches the application provider.

Run inside the existing backend image on the VPS. There are six requests, no
automatic retries, no expected-answer prompt, and less than five audio minutes.
The key is read from a mounted private file; it never appears in command arguments.
Reports contain the owner's transcript: save them outside Git with private access.
"""
from __future__ import annotations

import argparse
from io import BytesIO
import json
import math
import os
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
import uuid
import wave

ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
MODELS = ('whisper-large-v3-turbo', 'whisper-large-v3')
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_AUDIO_SECONDS = 300


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def multipart(audio: bytes, filename: str, mime: str, model: str):
    if model not in MODELS:
        raise ValueError('unsupported_model')
    if (filename, mime) not in (('answer.m4a', 'audio/mp4'), ('answer.wav', 'audio/wav')):
        raise ValueError('unsupported_file_metadata')
    boundary = 'oraliq-' + uuid.uuid4().hex
    fields = [
        ('model', model), ('language', 'ar'), ('temperature', '0'),
        ('response_format', 'verbose_json'),
        ('timestamp_granularities[]', 'word'), ('timestamp_granularities[]', 'segment'),
    ]
    chunks = []
    for name, value in fields:
        chunks.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n').encode())
    chunks.extend([
        (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n').encode(),
        audio, f'\r\n--{boundary}--\r\n'.encode(),
    ])
    return b''.join(chunks), f'multipart/form-data; boundary={boundary}'


def normalize(result: dict, seconds: float):
    transcript = result.get('text')
    if not isinstance(transcript, str) or not transcript.strip() or len(transcript) > 20000:
        raise ValueError('invalid_or_empty_transcript')
    segments = result.get('segments') or []
    words = result.get('words') or []
    if not isinstance(segments, list) or not isinstance(words, list):
        raise ValueError('invalid_timestamp_structure')
    if not words:
        words = [word for segment in segments for word in (segment.get('words') or [])]
    valid_words = []
    for word in words:
        start, end = word.get('start'), word.get('end')
        valid = (isinstance(start, (int, float)) and isinstance(end, (int, float))
                 and math.isfinite(start) and math.isfinite(end) and 0 <= start <= end <= seconds + 2
                 and isinstance(word.get('word'), str))
        if valid:
            valid_words.append({'word': word['word'], 'start': start, 'end': end})
    return {
        'transcript': transcript.strip(), 'words': valid_words,
        'word_count': len(transcript.split()), 'segment_count': len(segments),
        'word_timestamps_usable': bool(words) and len(valid_words) == len(words),
        'language': result.get('language'),
    }


def read_key(path: Path):
    if os.name != 'nt' and path.stat().st_mode & 0o077:
        raise ValueError('key_file_must_be_private')
    key = path.read_text(encoding='utf-8-sig').strip()
    if not re.fullmatch(r'gsk_[A-Za-z0-9_-]{20,200}', key):
        raise ValueError('missing_or_invalid_key_file')
    return key


def request_once(opener, key: str, audio: bytes, model: str, filename: str, mime: str, seconds: float):
    body, content_type = multipart(audio, filename, mime, model)
    request = Request(ENDPOINT, data=body, headers={
        'Authorization': 'Bearer ' + key, 'Content-Type': content_type,
        'User-Agent': 'OralIQ-owner-authorized-audio-probe/1.0',
    }, method='POST')
    started = time.perf_counter()
    try:
        with opener.open(request, timeout=90) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise ValueError('response_too_large')
            result = normalize(json.loads(raw), seconds)
            result.update(http_status=response.status, asr_request_seconds=time.perf_counter() - started)
            return result
    except HTTPError as error:
        retry_after = error.headers.get('Retry-After', '')
        retry_after = retry_after if re.fullmatch(r'[0-9.]{1,12}', retry_after) else None
        error.close()
        return {'http_status': error.code, 'retry_after_seconds': retry_after,
                'error': 'provider_rejected_request', 'asr_request_seconds': time.perf_counter() - started}
    except (URLError, TimeoutError, ValueError, OSError) as error:
        # Do not log request headers, response bodies or exception strings.
        return {'http_status': None, 'error': type(error).__name__,
                'asr_request_seconds': time.perf_counter() - started}


def save(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    path.chmod(0o600)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key-file', required=True, type=Path)
    parser.add_argument('--audio', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--confirm-free-account', action='store_true')
    parser.add_argument('--send-owner-test-audio', action='store_true')
    args = parser.parse_args()
    if not args.confirm_free_account or not args.send_owner_test_audio:
        parser.error('Requires free-account confirmation and explicit owner-audio authorization.')
    os.umask(0o077)
    if args.output.exists():
        parser.error('Choose a fresh output file; never overwrite a prior result.')
    key = read_key(args.key_file)
    from app.core.media_limits import check_audio_only, decode_audio_bounded
    import tempfile
    import numpy as np
    source = args.audio.read_bytes()
    if len(source) > 25 * 1024 * 1024 or source[4:8] != b'ftyp':
        raise ValueError('expected_known_owner_audio_only_m4a_under_25MB')
    check_audio_only(source)
    # Anonymous file on Linux; no named recording is created inside the container.
    with tempfile.TemporaryFile() as stream:
        stream.write(source)
        stream.flush()
        waveform = decode_audio_bounded(f'/proc/self/fd/{stream.fileno()}', 60)
    seconds = len(waveform) / 16000
    if not 1 <= seconds <= 40:
        raise ValueError('unexpected_owner_recording_duration')
    buffer = BytesIO()
    with wave.open(buffer, 'wb') as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(16000)
        writer.writeframes((np.clip(np.resize(waveform, 60 * 16000), -1, 1) * 32767).astype('<i2').tobytes())
    composed = buffer.getvalue()
    plan = [(model, 'original', source, seconds) for _ in range(2) for model in MODELS]
    plan += [(model, 'composed_60_seconds', composed, 60) for model in MODELS]
    assert len(plan) == 6 and sum(item[3] for item in plan) <= MAX_AUDIO_SECONDS
    report = {
        'purpose': 'owner_recording_free_tier_comparison_not_load_test',
        'endpoint': ENDPOINT, 'requested_language': 'ar', 'expected_answer_prompt_sent': False,
        'distinct_speakers': 1, 'real_students': 0, 'production_changed': False,
        'voice_identity_included': False, 'camera_included': False,
        'max_requests': 6, 'max_requested_audio_seconds': sum(item[3] for item in plan),
        'composed_audio': 'owner_clip_repeated_trimmed_not_a_real_minute_answer', 'requests': [],
    }
    opener = build_opener(ProxyHandler({}), NoRedirect())
    try:
        for model, kind, audio, duration in plan:
            print(json.dumps({'phase': 'request', 'model': model, 'input': kind,
                              'number': len(report['requests']) + 1}), flush=True)
            result = request_once(opener, key, audio, model,
                                  'answer.m4a' if kind == 'original' else 'answer.wav',
                                  'audio/mp4' if kind == 'original' else 'audio/wav', duration)
            result.update(model=model, input_kind=kind, input_audio_seconds=duration)
            report['requests'].append(result)
            save(args.output, report)
            if result.get('http_status') != 200:
                break  # Includes 429: preserve evidence and stop; never retry or switch accounts.
    finally:
        report['completed_requests'] = len(report['requests'])
        report['passed_execution_not_accuracy'] = len(report['requests']) == 6 and all(
            item.get('http_status') == 200 for item in report['requests'])
        save(args.output, report)
    print(json.dumps({'completed_requests': report['completed_requests'],
                      'passed_execution_not_accuracy': report['passed_execution_not_accuracy']}), flush=True)
    return 0 if report['passed_execution_not_accuracy'] else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({'phase': 'failed', 'error_type': type(error).__name__}), flush=True)
        raise SystemExit(1)
