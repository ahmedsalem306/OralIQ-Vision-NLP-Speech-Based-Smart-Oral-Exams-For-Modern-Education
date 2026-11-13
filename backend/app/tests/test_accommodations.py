import json
from uuid import uuid4
import pytest
from app.core.security import create_access_token
from app.models.user import User
from app.tests.exam_helpers import new_exam
from app.services.exam_evidence import face_evidence


def seed(db):
    suffix=uuid4().hex
    teacher=User(email=f"teacher-{suffix}@example.com",full_name="Teacher",role="lecturer",hashed_password="x")
    other=User(email=f"other-{suffix}@example.com",full_name="Other",role="lecturer",hashed_password="x")
    student=User(email=f"student-{suffix}@example.com",full_name="Student",role="student",hashed_password="x",
                 voice_embedding=json.dumps([.1]*256))
    db.add_all([teacher,other,student]);db.commit()
    return teacher,other,student,new_exam(db,creator_id=teacher.id)


def headers(user):
    return {"Authorization":f"Bearer {create_access_token(user.id)}"}


def test_covered_face_needs_exam_owner_approval_and_never_invents_a_face_score(client,db):
    teacher,other,student,q=seed(db)
    sh,th,oh=headers(student),headers(teacher),headers(other)
    assert client.put("/api/v1/accommodations/preference",headers=sh,json={"mode":"covered"}).status_code==200
    status=client.get("/api/v1/voice/status",headers=sh).json()
    assert status["biometrics_complete"] and status["identity_mode"]=="covered" and not status["has_faceprint"]
    response=client.get(f"/api/v1/exams/access-check/{q.exam_token}",headers=sh)
    assert response.status_code==403 and response.json()["detail"]["code"]=="ACCOMMODATION_APPROVAL_REQUIRED"
    request=client.post(f"/api/v1/accommodations/requests/{q.exam_token}",headers=sh).json()
    path=f"/api/v1/accommodations/requests/{request['id']}/review"
    approval={"decision":"approved","identity_checked":True}
    assert client.post(path,headers=sh,json=approval).status_code==404
    assert client.post(path,headers=oh,json=approval).status_code==404
    assert client.post(path,headers=th,json={"decision":"approved"}).status_code==422
    assert client.post(path,headers=th,json=approval).status_code==200
    assert not client.get("/api/v1/accommodations/requests",headers=oh).json()
    own=client.get("/api/v1/accommodations/requests",headers=th).json()
    assert any(row["id"]==request["id"] and "منتقبة" in row["label"] for row in own)
    assert client.get(f"/api/v1/exams/access-check/{q.exam_token}",headers=sh).status_code==200
    import cv2
    import numpy as np
    _,frame=cv2.imencode(".jpg",np.zeros((100,160,3),dtype=np.uint8))
    eye_result=client.post("/api/v1/accommodations/eyes",headers=sh,data={"exam_token":q.exam_token},
                           files={"image":("eyes.jpg",frame.tobytes(),"image/jpeg")})
    assert eye_result.status_code==200
    assert eye_result.json()["identity_verified"] is False and eye_result.json()["eyes_visible"] is None
    evidence=face_evidence(db,student,q)
    assert evidence["face_verification"]=="covered_approved"
    assert evidence["face_score"] is None and evidence["facial_score"] is None
    assert client.put("/api/v1/accommodations/preference",headers=sh,json={"mode":"face"}).status_code==409
    # That lecturer approval is not valid for a different exam.
    next_exam=new_exam(db,creator_id=teacher.id)
    assert client.get(f"/api/v1/exams/access-check/{next_exam.exam_token}",headers=sh).status_code==403
    assert client.post("/api/v1/accommodations/eyes",headers=sh,data={"exam_token":next_exam.exam_token},
                       files={"image":("eyes.jpg",frame.tobytes(),"image/jpeg")}).status_code==403


def test_covered_mode_does_not_skip_voice_enrollment(client,db):
    _,_,student,q=seed(db)
    student.voice_embedding=None;db.commit()
    assert client.put("/api/v1/accommodations/preference",headers=headers(student),json={"mode":"covered"}).status_code==200
    assert not client.get("/api/v1/voice/status",headers=headers(student)).json()["biometrics_complete"]
    response=client.get(f"/api/v1/exams/access-check/{q.exam_token}",headers=headers(student))
    assert response.status_code==403 and response.json()["detail"]["code"]=="BIOMETRICS_REQUIRED"


def test_eye_visibility_never_claims_identity_or_a_gaze_direction():
    import cv2
    import numpy as np
    from app.services.eye_visibility import observe
    _,encoded=cv2.imencode(".jpg",np.zeros((100,160,3),dtype=np.uint8))
    result=observe(encoded.tobytes())
    assert result["identity_verified"] is False
    assert result["eyes_visible"] is None and result["status"]=="unavailable"
    assert result.get("gaze_direction") is None
