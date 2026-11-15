"""Transcription stability and separation of spoken evidence from expected answers."""
import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import warnings

import numpy as np
import pytest

from app.services import grading_pipeline


@pytest.fixture
def analyzer(monkeypatch):
    # Import the service without ffmpeg installation or any local ML weight loading.
    monkeypatch.setitem(sys.modules, "imageio_ffmpeg", None)
    spec = importlib.util.spec_from_file_location(
        "speech_settings_check", Path(grading_pipeline.__file__).with_name("speech_ai.py"))
    module = importlib.util.module_from_spec(spec)
    with warnings.catch_warnings():
        spec.loader.exec_module(module)
    instance = module.SpeechAnalyzer()
    captured = []

    class Model:
        def transcribe(self, waveform, **options):
            captured.append(options)
            return iter([SimpleNamespace(text="كلام مسجل", start=0, end=2, words=[])]), None

    instance._model = Model()
    from app.core import media_limits
    monkeypatch.setattr(media_limits, "decode_audio_bounded", lambda *args: np.ones(32000, dtype=np.float32))
    return instance, captured


def test_graded_transcription_never_receives_reference_answer(analyzer):
    service, captured = analyzer
    result = service.analyze_fluency("fixture.wav", hint="SECRET EXPECTED ANSWER")
    assert result["transcript"] == "كلام مسجل"
    assert captured[0]["initial_prompt"] is None
    assert captured[0]["temperature"] == 0.0
    assert captured[0]["word_timestamps"] is True


def test_dictation_retains_bounded_vocabulary_context_without_filler_priming(analyzer):
    service, captured = analyzer
    assert service.transcribe_audio("fixture.wav", hint="v" * 800) == "كلام مسجل"
    assert captured[0]["initial_prompt"] == "v" * 500
    assert captured[0]["temperature"] == 0.0
    assert captured[0]["word_timestamps"] is False


def test_empty_dictation_hint_is_not_replaced_by_filler_words(analyzer):
    service, captured = analyzer
    service.transcribe_audio("fixture.wav", hint="   ")
    assert captured[0]["initial_prompt"] is None


def test_pipeline_sends_reference_only_to_content_grading(monkeypatch):
    def analyze(audio_path):  # rejects an accidental hint/model-answer argument
        return {"transcript": "actual spoken words", "speech_score": 95, "fluency_report": "fixture"}
    def evaluate(transcript, reference, keywords):
        assert transcript == "actual spoken words"
        assert reference == "EXPECTED ANSWER"
        return {"score": 85}
    monkeypatch.setitem(sys.modules, "app.services.speech_ai", SimpleNamespace(speech_analyzer=SimpleNamespace(analyze_fluency=analyze)))
    monkeypatch.setitem(sys.modules, "app.services.voice_ai", SimpleNamespace(voice_service=object()))
    monkeypatch.setitem(sys.modules, "app.services.nlp_ai", SimpleNamespace(nlp_analyzer=SimpleNamespace(evaluate_answer=evaluate)))
    result = grading_pipeline.run_ai_pipeline("fixture.wav", "EXPECTED ANSWER", "", "{}", None)
    assert result["nlp_score"] == 85
    assert result["voice_score"] is None


def test_pipeline_preserves_provider_wait_for_the_durable_worker(monkeypatch):
    from app.core.speech_config import SpeechProviderDeferred
    def wait(*args):
        raise SpeechProviderDeferred("groq_rate_limit", 17)
    monkeypatch.setitem(sys.modules, "app.services.speech_ai", SimpleNamespace(speech_analyzer=SimpleNamespace(analyze_fluency=wait)))
    monkeypatch.setitem(sys.modules, "app.services.voice_ai", SimpleNamespace(voice_service=object()))
    with pytest.raises(SpeechProviderDeferred) as error:
        grading_pipeline.run_ai_pipeline("fixture.wav", "EXPECTED ANSWER", "", "{}", None)
    assert error.value.retry_after == 17
