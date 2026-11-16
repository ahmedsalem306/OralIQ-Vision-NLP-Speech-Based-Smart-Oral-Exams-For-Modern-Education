import json
import numpy as np
import pytest

from app.models.user import User
from app.services import face_biometrics as face
from app.services.exam_evidence import has_faceprint
from app.tests.test_billing import env, make_user  # noqa: F401


@pytest.mark.parametrize('size', [128, 512])
def test_unversioned_legacy_templates_are_not_current(size):
    raw = json.dumps([0.1] * size)
    assert not face.has_current_template(raw)
    assert not has_faceprint(User(face_embedding=raw))


def test_model_namespace_and_finite_nonzero_vectors_are_required():
    raw = face.encode_template([0.1] * face.EMBEDDING_DIM)
    assert face.has_current_template(raw)
    data = json.loads(raw)
    data['model'] = 'different-sface-weights'
    assert not face.has_current_template(json.dumps(data))
    for vector in ([0] * 128, [float('nan')] * 128, [float('inf')] * 128):
        with pytest.raises(ValueError):
            face.encode_template(vector)


def test_models_are_not_auto_downloaded_and_missing_weights_fail_closed(tmp_path, monkeypatch):
    service = face.FaceBiometricsService()
    monkeypatch.setenv('OPENCV_FACE_HOME', str(tmp_path))
    with pytest.raises(RuntimeError, match='unavailable'):
        service._ensure_app()
    assert not service.get_status()['ready']
    assert not list(tmp_path.iterdir())


def test_stale_template_can_be_reenrolled_without_accepting_its_identity(env, monkeypatch):
    client, Session = env
    uid, headers = make_user(Session, 'stale-face@t.com', role='student',
                             face_embedding=json.dumps([0.1] * 512), face_locked=True)
    before = client.get('/api/v1/face/status', headers=headers).json()
    assert before['needs_reenroll'] and not before['has_faceprint']
    monkeypatch.setattr(face.face_biometrics_service, 'extract_embedding',
                        lambda _: {'embedding':[0.1]*128, 'num_faces':1})
    response = client.post('/api/v1/face/enroll', headers=headers,
                           files=[('images',('camera.jpg',b'x'*600,'image/jpeg'))]*3)
    assert response.status_code == 200
    with Session() as db:
        assert face.has_current_template(db.get(User,uid).face_embedding)
    assert client.get('/api/v1/face/status',headers=headers).json()['engine'] == 'opencv_sface'


def test_multiple_faces_cannot_be_enrolled(env, monkeypatch):
    client, Session = env
    uid, headers = make_user(Session, 'crowd-face@t.com', role='student', face_embedding=None)
    monkeypatch.setattr(face.face_biometrics_service, 'extract_embedding',
                        lambda _: {'embedding':[0.1]*128, 'num_faces':2})
    assert client.post('/api/v1/face/enroll',headers=headers,
                       files=[('images',('camera.jpg',b'x'*600,'image/jpeg'))]*3).status_code == 400
    with Session() as db:
        assert db.get(User,uid).face_embedding is None
