"""Provider transport and timestamp evidence; all HTTP is fake, no local weights."""
from io import BytesIO
import json
from types import SimpleNamespace
from urllib.error import HTTPError, URLError

import numpy as np
import pytest

from app.core.speech_config import (SpeechProviderDeferred, SpeechProviderError,
                                  groq_settings, provider_name, speech_config_problems)
from app.services import groq_speech


@pytest.fixture
def transport(monkeypatch):
    monkeypatch.setenv('SPEECH_PROVIDER', 'groq')
    monkeypatch.setenv('GROQ_API_KEY', 'gsk_' + 'a' * 32)
    monkeypatch.delenv('GROQ_API_KEY_FILE', raising=False)
    reservations, blocks, calls = [], [], []
    monkeypatch.setattr(groq_speech.speech_budget, 'reserve', reservations.append)
    monkeypatch.setattr(groq_speech.speech_budget, 'block_for', blocks.append)
    payload = {'text': 'كلام مسجل', 'words': [
        {'word': 'كلام', 'start': 0, 'end': .5}, {'word': 'مسجل', 'start': .6, 'end': 1.5},
    ]}

    class Response(BytesIO):
        status = 200

    def open_request(request, timeout):
        calls.append(request)
        return Response(json.dumps(payload).encode())

    monkeypatch.setattr(groq_speech, '_opener', lambda: SimpleNamespace(open=open_request))
    return SimpleNamespace(payload=payload, reservations=reservations, blocks=blocks, calls=calls,
                           waveform=np.ones(32000, dtype=np.float32))


def test_local_is_default_and_external_config_is_fail_closed(monkeypatch):
    monkeypatch.delenv('SPEECH_PROVIDER', raising=False)
    assert provider_name() == 'local'
    assert speech_config_problems() == []
    monkeypatch.setenv('SPEECH_PROVIDER', 'typo')
    assert speech_config_problems()
    monkeypatch.setenv('SPEECH_PROVIDER', 'groq')
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    monkeypatch.delenv('GROQ_API_KEY_FILE', raising=False)
    assert 'private API key' in speech_config_problems()[0]


def test_bad_limits_cannot_remove_protection(monkeypatch):
    monkeypatch.setenv('GROQ_REQUESTS_PER_MINUTE', 'unlimited')
    with pytest.raises(SpeechProviderError, match='GROQ_REQUESTS_PER_MINUTE'):
        groq_settings()


def test_real_analyzer_routes_to_groq_without_loading_local_whisper(transport, monkeypatch):
    from app.services.speech_ai import SpeechAnalyzer
    from app.core import media_limits
    monkeypatch.setattr(media_limits, 'decode_audio_bounded', lambda *args: transport.waveform)
    service = SpeechAnalyzer()
    result = service.analyze_fluency('/anonymous/recording', hint='SECRET EXPECTED ANSWER')
    assert result['transcript'] == transport.payload['text']
    assert result['details']['total_duration'] == 1.5
    assert service._model is None
    request = transport.calls[0]
    assert request.full_url == groq_speech.ENDPOINT
    assert b'filename="answer.wav"' in request.data
    assert b'SECRET EXPECTED ANSWER' not in request.data
    assert b'name="prompt"' not in request.data
    assert b'name="timestamp_granularities[]"' in request.data
    assert transport.reservations == [2]


def test_dictation_can_use_bounded_context(transport):
    text, _, _ = groq_speech.transcribe(transport.waveform, hint='v' * 500)
    assert text == transport.payload['text']
    assert b'v' * 200 in transport.calls[0].data
    assert b'v' * 201 not in transport.calls[0].data


@pytest.mark.parametrize('code,reason,delay', [(429, 'groq_rate_limit', 17), (401, 'groq_credentials', 3600)])
def test_quota_or_key_problem_defers_without_http_retry(transport, monkeypatch, code, reason, delay):
    body = BytesIO(b'PRIVATE ERROR AND TOKEN')
    calls = []
    def fail(request, timeout):
        calls.append(request)
        raise HTTPError(groq_speech.ENDPOINT, code, 'redacted', {'Retry-After': '17'}, body)
    monkeypatch.setattr(groq_speech, '_opener', lambda: SimpleNamespace(open=fail))
    with pytest.raises(SpeechProviderDeferred) as error:
        groq_speech.transcribe(transport.waveform, word_timestamps=True)
    assert error.value.reason == reason and error.value.retry_after == delay
    assert transport.blocks == [delay] and len(calls) == 1
    assert transport.reservations == [2] and body.closed
    assert 'PRIVATE' not in str(error.value)


def test_admission_refusal_sends_no_audio_and_never_falls_back(transport, monkeypatch):
    def blocked(*args):
        raise SpeechProviderDeferred('groq_budget', 60)
    monkeypatch.setattr(groq_speech.speech_budget, 'reserve', blocked)
    with pytest.raises(SpeechProviderDeferred):
        groq_speech.transcribe(transport.waveform)
    assert transport.calls == []


def test_transport_error_is_redacted_and_consumes_its_reservation(transport, monkeypatch):
    def fail(*args, **kwargs):
        raise URLError('gsk_' + 'a' * 32)
    monkeypatch.setattr(groq_speech, '_opener', lambda: SimpleNamespace(open=fail))
    with pytest.raises(SpeechProviderError) as error:
        groq_speech.transcribe(transport.waveform)
    assert 'gsk_' not in str(error.value)
    assert transport.reservations == [2]


@pytest.mark.parametrize('words', [None, [], [{'word': 'x', 'start': 4, 'end': 2}],
                                 [{'word': 'x', 'start': 0, 'end': float('nan')}],
                                 [{'word': 'x', 'start': 0, 'end': 100}]])
def test_missing_or_invalid_timestamps_cannot_generate_fluency_grade(words):
    with pytest.raises(SpeechProviderError):
        groq_speech._normalize({'text': 'speech', 'words': words}, 2, True)


def test_silent_transcript_is_not_a_successful_fluency_grade():
    assert groq_speech._normalize({'text': ''}, 2, True)[0:2] == ('', [])


@pytest.mark.parametrize('raw,expected', [(None, 60), ('broken', 60), ('nan', 60), ('17.2', 18), ('9999999', 86400)])
def test_provider_retry_after_is_bounded(raw, expected):
    assert groq_speech._retry_after(raw) == expected


def test_response_size_is_bounded_and_redirect_cannot_forward_key(transport, monkeypatch):
    class LargeResponse(BytesIO):
        status = 200
    monkeypatch.setattr(groq_speech, '_opener', lambda: SimpleNamespace(
        open=lambda *args, **kwargs: LargeResponse(b'x' * (groq_speech.MAX_RESPONSE_BYTES + 1))))
    with pytest.raises(SpeechProviderError, match='too_large'):
        groq_speech.transcribe(transport.waveform)
    assert groq_speech._NoRedirect().redirect_request(None, None, 307, '', {}, 'https://other.invalid') is None
