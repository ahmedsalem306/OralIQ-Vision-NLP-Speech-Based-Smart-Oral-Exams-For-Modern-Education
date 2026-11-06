from io import BytesIO
from datetime import timedelta
import wave

import numpy as np
import pytest
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.testclient import TestClient
from PIL import Image

from app.core.media_limits import check_image_dimensions, decode_audio_bounded
from app.core.request_limits import RequestSizeLimitMiddleware
from app.models.team_invitation import TeamInvitation
from app.models.user import User
from app.services.billing_service import utcnow
from app.tests.test_billing import env, make_user, get_user  # noqa: F401


@pytest.fixture
def limited_client():
    app = FastAPI()
    app.add_middleware(RequestSizeLimitMiddleware, max_bytes=128)
    @app.post("/body")
    async def body(request: Request):
        return {"size": len(await request.body())}
    @app.post("/upload")
    async def upload(file: UploadFile = File(...)):
        return {"size": len(await file.read())}
    return TestClient(app)


def test_chunked_request_and_false_length_cannot_bypass_body_cap(limited_client):
    assert limited_client.post("/body", content=iter([b"x" * 80, b"x" * 80])).status_code == 413
    assert limited_client.post("/body", content=b"x" * 160, headers={"Content-Length": "1"}).status_code == 413
    assert limited_client.post("/body", content=b"okay").json() == {"size": 4}
    assert limited_client.post("/body", content=b"", headers={"Content-Length": "-1"}).status_code == 400


def test_multipart_is_capped_before_file_is_parsed(limited_client):
    assert limited_client.post("/upload", files={"file": ("x.bin", b"x" * 256)}).status_code == 413


def test_image_dimensions_and_formats_are_checked():
    buffer = BytesIO()
    Image.new("RGB", (5000, 1)).save(buffer, format="PNG")
    with pytest.raises(ValueError, match="dimensions"):
        check_image_dimensions(buffer.getvalue())
    with pytest.raises(ValueError):
        check_image_dimensions(b"not-an-image")
    buffer = BytesIO()
    Image.new("RGB", (32, 32)).save(buffer, format="JPEG")
    check_image_dimensions(buffer.getvalue())


def test_decoded_audio_cannot_exceed_budget(tmp_path):
    path = tmp_path / "three-seconds.wav"
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(np.zeros(48000, dtype=np.int16).tobytes())
    result = decode_audio_bounded(str(path), max_seconds=1)
    assert result.shape == (16000,)
    assert result.dtype == np.float32


def test_media_decode_disallows_network_playlists(tmp_path):
    import av
    path = tmp_path / "disguised-recording.webm"
    path.write_text("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nhttp://127.0.0.1:9/private.wav\n#EXT-X-ENDLIST\n")
    with pytest.raises((av.error.FFmpegError, ValueError)):
        decode_audio_bounded(str(path))


def invite(client, owner, email):
    return client.post("/api/v1/billing/team", headers=owner, json={"email": email})


def decide(client, user, invitation_id, accept):
    return client.post(f"/api/v1/billing/team/invitations/{invitation_id}/decision", headers=user, json={"accept": accept})


def test_only_recipient_can_accept_and_decline_does_not_link(env):
    client, Session = env
    _, owner = make_user(Session, "owner-consent@t.com", plan_tier="campus")
    recipient_id, recipient = make_user(Session, "recipient-consent@t.com")
    _, stranger = make_user(Session, "stranger-consent@t.com")
    assert invite(client, owner, "recipient-consent@t.com").status_code == 202
    invitation_id = client.get("/api/v1/billing/team/invitations", headers=recipient).json()[0]["id"]
    assert get_user(Session, recipient_id).owner_id is None
    assert decide(client, stranger, invitation_id, True).status_code == 404
    assert decide(client, owner, invitation_id, True).status_code == 404
    assert decide(client, recipient, invitation_id, False).status_code == 200
    assert get_user(Session, recipient_id).owner_id is None
    assert decide(client, recipient, invitation_id, True).status_code == 409


def test_accept_rechecks_expiry_and_current_seat_capacity(env):
    client, Session = env
    owner_id, owner = make_user(Session, "owner-full@t.com", plan_tier="campus")
    recipient_id, recipient = make_user(Session, "recipient-full@t.com")
    invite(client, owner, "recipient-full@t.com")
    invitation_id = client.get("/api/v1/billing/team/invitations", headers=recipient).json()[0]["id"]
    with Session() as db:
        invitation = db.get(TeamInvitation, invitation_id)
        invitation.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert decide(client, recipient, invitation_id, True).status_code == 409
    invite(client, owner, "recipient-full@t.com")
    for i in range(3):
        make_user(Session, f"occupied-{i}@t.com", owner_id=owner_id)
    assert decide(client, recipient, invitation_id, True).status_code == 409
    assert get_user(Session, recipient_id).owner_id is None


def test_students_cannot_use_synchronous_dictation(env):
    client, Session = env
    _, student = make_user(Session, "student-dictation@t.com", role="student")
    assert client.post("/api/v1/speech/transcribe", headers=student,
                       files={"audio": ("x.wav", b"x" * 1000)}).status_code == 403


def test_legacy_individual_exam_token_cannot_be_hijacked_as_a_group(env):
    from app.models.question import Question
    client, Session = env
    owner_id, _ = make_user(Session, "legacy-owner@t.com")
    _, attacker = make_user(Session, "legacy-attacker@t.com")
    with Session() as db:
        question = Question(text="Private legacy question", model_answer="Answer", creator_id=owner_id)
        db.add(question)
        db.commit()
        token = question.exam_token
    result = client.post("/api/v1/questions/", headers=attacker, json={
        "text": "Injected question", "model_answer": "Answer", "group_token": token,
    })
    assert result.status_code == 403


def test_access_tokens_without_expiry_are_refused(env):
    import jwt
    from app.core.config import settings
    client, Session = env
    uid, _ = make_user(Session, "no-expiry@t.com")
    token = jwt.encode({"sub": str(uid), "tv": 0}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    assert client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_old_password_hash_is_upgraded_only_after_successful_login(env):
    from passlib.hash import pbkdf2_sha256
    from app.core import security
    client, Session = env
    uid, _ = make_user(Session, "hash-upgrade@t.com", email_verified=True)
    old_hash = pbkdf2_sha256.using(rounds=29_000).hash("correct-password")
    with Session() as db:
        user = db.get(User, uid)
        user.hashed_password = old_hash
        db.commit()
    assert client.post("/api/v1/login/access-token", data={"username": "hash-upgrade@t.com", "password": "wrong-password"}).status_code == 400
    assert get_user(Session, uid).hashed_password == old_hash
    assert client.post("/api/v1/login/access-token", data={"username": "hash-upgrade@t.com", "password": "correct-password"}).status_code == 200
    updated = get_user(Session, uid).hashed_password
    assert updated != old_hash and security.verify_password("correct-password", updated)
    assert pbkdf2_sha256.from_string(updated).rounds >= 600_000
