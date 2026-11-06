import asyncio
from dataclasses import replace
import json
import os
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from scripts.load_test_prepare import prepare, require_load_database
from scripts.load_test_selfcheck import mock_school, selfcheck
from scripts.model_smoke import configure_cache
from scripts.school_load_test import Config, Runner, write_report
from app.core.database import Base
from app.models.user import User
from app.models.question import Question


@pytest.mark.parametrize("url", ["https://production.example.com", "http://staging.example.com", "https://staging.example.com/api/v1", "https://u:p@staging.example.com"])
def test_refuse_unsafe_or_non_staging_target(url):
    with pytest.raises(ValueError):
        Config(url).validate()


def test_database_guard_refuses_real_or_sqlite_database():
    require_load_database("postgresql://test:test@localhost/oraliq_loadtest")
    for url in ("postgresql://test:test@localhost/oraliq", "sqlite:///oraliq_loadtest.db"):
        with pytest.raises(ValueError):
            require_load_database(url)


def test_500_students_two_questions_control_flow(tmp_path):
    result = asyncio.run(selfcheck())
    assert result["accepted_answers"] == result["unique_accepted_answers"] == result["completed"] == 1000
    assert result["started_students"] == 500
    assert result["is_server_capacity_proof"] is False
    assert result["measurement"] == "control_flow_only_mock"
    assert result["run_passed_transport_checks"] is True
    path = tmp_path / "report.json"
    write_report(result, path)
    serialized = path.read_text(encoding="utf-8")
    assert "MOCK-password" not in serialized and "MOCK-owner" not in serialized and "Bearer" not in serialized
    assert "ليست قياسًا للسيرفر" in path.with_suffix(".html").read_text(encoding="utf-8")


def config():
    return Config("http://localhost", students=1, question_seconds=.001, ramp_seconds=0, submit_window_seconds=0,
                  face_interval_seconds=.001, session_interval_seconds=.001, poll_interval_seconds=.001,
                  metrics_interval_seconds=.01, wait_seconds=.05, submit_attempts=2)


def test_lost_submit_response_recovers_same_durable_answer():
    manifest, transport, accepted, _ = mock_school(1, lose_response=True)
    result = asyncio.run(Runner(config(), manifest, [b"one", b"two"], [b"face"], transport=transport).run())
    assert len(accepted) == result["accepted_answers"] == 2
    assert result["transport_errors"] == 2
    assert result["all_answers_received_and_graded"]
    assert not result["run_passed_transport_checks"]


def test_retries_reuse_the_same_key_and_report_first_rejections(monkeypatch):
    original_sleep = asyncio.sleep
    async def quick_sleep(delay):
        await original_sleep(min(delay, .001))
    monkeypatch.setattr(asyncio, "sleep", quick_sleep)
    manifest, transport, accepted, seen = mock_school(1, reject_first=True)
    result = asyncio.run(Runner(config(), manifest, [b"one", b"two"], [b"face"], transport=transport).run())
    assert len(accepted) == result["accepted_answers"] == 2
    assert seen[0][0] == seen[1][0] and seen[2][0] == seen[3][0]
    assert result["first_submit_rejections"] == 2
    assert result["all_answers_received_and_graded"] and not result["run_passed_transport_checks"]


def test_auth_probe_never_starts_an_exam_or_touches_models():
    manifest, transport, _, _ = mock_school(1)
    result = asyncio.run(Runner(replace(config(), auth_only=True), manifest, [], [], transport=transport).run())
    assert result["authenticated_students"] == 1
    assert result["started_students"] == result["expected_answers"] == 0
    assert result["all_answers_received_and_graded"] is None
    assert "face_verify" not in result["requests"] and "submit" not in result["requests"]


def test_failed_grading_is_not_success_and_pending_is_not_loss():
    for status in ("failed", "queued"):
        manifest, transport, _, _ = mock_school(1, grading_status=status)
        result = asyncio.run(Runner(config(), manifest, [b"one", b"two"], [b"face"], transport=transport).run())
        assert result["accepted_answers"] == 2
        assert not result["all_answers_received_and_graded"]
        assert result["failed_grading" if status == "failed" else "pending"] == 2


def test_fixture_origin_mismatch_and_fake_enrollment_refused():
    manifest, _, _, _ = mock_school(1)
    with pytest.raises(ValueError, match="genuinely enrolled"):
        Runner(config(), manifest, [b"one", b"two"], [b"face"])
    manifest["allowed_origin"] = "https://staging.other.example"
    with pytest.raises(ValueError, match="allowed_origin"):
        Runner(config(), manifest, [b"one", b"two"], [b"face"])


def test_prepare_isolated_fixture_does_not_pretend_fake_biometrics_are_real():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as db:
        manifest = prepare(db, "http://localhost", students=3, questions=2, minutes=3)
        assert manifest["biometric_mode"] == "scaffold_unenrolled"
        assert db.query(Question).count() == 2
        students = db.query(User).filter(User.role == "student").all()
        assert len(students) == 3 and all(not u.face_embedding and not u.voice_embedding for u in students)
        with pytest.raises(ValueError):
            prepare(db, "http://localhost", identity_email=students[0].email)
    engine.dispose()


def test_model_check_requires_cache_and_does_not_download_by_default(tmp_path):
    with patch.dict(os.environ):
        with pytest.raises(ValueError, match="cache is missing"):
            configure_cache(tmp_path)
        assert os.environ["HF_HUB_OFFLINE"] == "1"
        assert os.environ["HF_HOME"].startswith(str(tmp_path))


def test_legacy_vad_metadata_patch_is_narrow_and_preserves_vad_code():
    from scripts.patch_legacy_vad import patched_source
    source = "import pkg_resources\nimport _webrtcvad\n__version__ = pkg_resources.get_distribution('webrtcvad').version\nclass Vad: pass\n"
    result = patched_source(source)
    assert "pkg_resources" not in result
    assert "version('webrtcvad')" in result
    assert "import _webrtcvad\n" in result and result.endswith("class Vad: pass\n")
    with pytest.raises(ValueError, match="Unexpected"):
        patched_source("unknown future wrapper")
