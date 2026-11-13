from io import BytesIO
import wave

import av
import numpy as np
import pytest

from app.core.media_limits import check_audio_only, decode_audio_bounded


def test_audio_only_wav_is_allowed():
    buffer = BytesIO()
    with wave.open(buffer, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(16000)
        stream.writeframes(b"\x00\x00" * 1600)
    check_audio_only(buffer.getvalue())


def video_bytes():
    buffer = BytesIO()
    with av.open(buffer, mode="w", format="matroska") as output:
        stream = output.add_stream("mpeg4", rate=1)
        stream.width = stream.height = 32
        stream.pix_fmt = "yuv420p"
        frame = av.VideoFrame.from_ndarray(np.zeros((32, 32, 3), dtype=np.uint8), format="rgb24")
        for packet in stream.encode(frame):
            output.mux(packet)
        for packet in stream.encode():
            output.mux(packet)
    return buffer.getvalue()


def test_video_cannot_be_disguised_as_an_audio_upload(tmp_path):
    content = video_bytes()
    with pytest.raises(ValueError, match="Video"):
        check_audio_only(content)
    disguised = tmp_path / "answer.wav"
    disguised.write_bytes(content)
    with pytest.raises(ValueError, match="Video"):
        decode_audio_bounded(str(disguised))


def test_invalid_recording_is_rejected():
    with pytest.raises(ValueError, match="Invalid"):
        check_audio_only(b"not an audio recording")


def test_video_upload_never_creates_a_submission_or_queue_job(client, db):
    from app.core.security import create_access_token
    from app.models.user import User
    from app.models.exam_submission import ExamSubmission
    from app.models.grading_job import GradingJob
    from app.tests.exam_helpers import ENROLLED, new_exam, open_sitting

    student = User(email="audio-privacy@example.com", full_name="Privacy test", role="student",
                   hashed_password="not-used", **ENROLLED)
    db.add(student)
    db.commit()
    question = new_exam(db)
    open_sitting(db, student, question)
    before = (db.query(ExamSubmission).count(), db.query(GradingJob).count())
    response = client.post("/api/v1/exams/submit", headers={"Authorization": f"Bearer {create_access_token(student.id)}"},
                           data={"question_id": question.id, "student_name": "Test", "student_number": "1"},
                           files={"audio": ("answer.webm", video_bytes(), "audio/webm")})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "AUDIO_ONLY_REQUIRED"
    assert (db.query(ExamSubmission).count(), db.query(GradingJob).count()) == before
