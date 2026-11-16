"""CPU face ID: pinned YuNet (MIT) and SFace (Apache-2.0), no runtime downloads."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import threading
import cv2
import numpy as np

EMBEDDING_DIM = 128
MODEL_VERSION = "opencv-sface-2021dec-0ba9fbfa01b5"
# Conservative existing gate; not a calibrated SFace accuracy/liveness guarantee.
MATCH_THRESHOLD = EXAM_THRESHOLD = 0.55
MANIFEST = Path(__file__).resolve().parents[1] / "assets/opencv-face-manifest.json"


def _vector(values) -> np.ndarray:
    try:
        vector = np.asarray(values, dtype=np.float32)
    except (ValueError, TypeError) as error:
        raise ValueError("Invalid face template") from error
    if vector.shape != (EMBEDDING_DIM,) or not np.isfinite(vector).all():
        raise ValueError("Invalid face template")
    norm = float(np.linalg.norm(vector))
    if not np.isfinite(norm) or norm < 1e-6:
        raise ValueError("Invalid face template")
    return vector / norm


def encode_template(values) -> str:
    return json.dumps({"model": MODEL_VERSION, "embedding": _vector(values).tolist()}, allow_nan=False)


def decode_template(raw: str) -> list[float]:
    data = json.loads(raw or "null")
    if not isinstance(data, dict) or data.get("model") != MODEL_VERSION:
        raise ValueError("Face model changed; reenrollment required")
    return _vector(data.get("embedding")).tolist()


def has_current_template(raw: str | None) -> bool:
    try:
        decode_template(raw or "")
        return True
    except (TypeError, ValueError):
        return False


class FaceBiometricsService:
    def __init__(self):
        self._app = None
        self._lock = threading.Lock()
        self._inference_lock = threading.Lock()
        self._load_error = None
        self.engine = "opencv_sface"

    def _root(self) -> Path:
        return Path(os.environ.get("OPENCV_FACE_HOME", "/models/opencv-face"))

    def _ensure_app(self):
        if self._app is not None:
            return
        with self._lock:
            if self._app is not None:
                return
            try:
                cv2.setNumThreads(1)
                paths = {}
                for key, model in json.loads(MANIFEST.read_text())["models"].items():
                    path = self._root() / model["filename"]
                    if (not path.is_file() or path.stat().st_size != model["bytes"]
                            or hashlib.sha256(path.read_bytes()).hexdigest() != model["sha256"]):
                        raise RuntimeError("Pinned face model missing or invalid")
                    paths[key] = str(path)
                detector = cv2.FaceDetectorYN.create(paths["yunet"], "", (320, 320), 0.85, 0.3, 5000,
                                                     cv2.dnn.DNN_BACKEND_OPENCV, cv2.dnn.DNN_TARGET_CPU)
                recognizer = cv2.FaceRecognizerSF.create(paths["sface"], "",
                                                        cv2.dnn.DNN_BACKEND_OPENCV, cv2.dnn.DNN_TARGET_CPU)
                self._app = (detector, recognizer)
                self._load_error = None
            except Exception as error:
                self._load_error = "Face model unavailable"
                raise RuntimeError("Face model unavailable; provision the pinned OpenCV models") from error

    def is_ready(self) -> bool:
        try:
            self._ensure_app()
            return True
        except RuntimeError:
            return False

    def get_status(self) -> dict:
        return {"engine": self.engine, "ready": self._app is not None and self._load_error is None,
                "embedding_dim": EMBEDDING_DIM, "model": MODEL_VERSION, "error": self._load_error}

    def _decode_bgr(self, image_bytes: bytes) -> np.ndarray:
        from app.core.media_limits import check_image_dimensions
        check_image_dimensions(image_bytes)
        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("تعذّر قراءة صورة الوجه")
        return image

    def extract_embedding(self, image_bytes: bytes) -> dict:
        self._ensure_app()
        image = self._decode_bgr(image_bytes)
        height, width = image.shape[:2]
        scale = min(1.0, 640 / max(height, width))
        if scale < 1:
            image = cv2.resize(image, (max(1, round(width * scale)), max(1, round(height * scale))))
        with self._inference_lock:
            detector, recognizer = self._app
            detector.setInputSize((image.shape[1], image.shape[0]))
            _, faces = detector.detect(image)
            if faces is None or not len(faces):
                raise ValueError("لم يتم العثور على وجه في الصورة — انظر للكاميرا بوضوح")
            face = max(faces, key=lambda item: float(item[2] * item[3]))
            embedding = _vector(recognizer.feature(recognizer.alignCrop(image, face)).reshape(-1))
        x, y, w, h = [float(value) / scale for value in face[:4]]
        return {"embedding": embedding.tolist(), "det_score": float(face[-1]),
                "bbox": [x, y, x + w, y + h], "pose": None, "num_faces": len(faces)}

    def average_embeddings(self, embeddings: list[list[float]]) -> list[float]:
        if not embeddings:
            raise ValueError("No embeddings to average")
        return _vector(np.stack([_vector(value) for value in embeddings]).mean(axis=0)).tolist()

    def verify_face(self, stored_embedding: list[float], current_embedding: list[float], threshold=None) -> dict:
        threshold = EXAM_THRESHOLD if threshold is None else threshold
        try:
            left, right = _vector(stored_embedding), _vector(current_embedding)
        except ValueError:
            return {"similarity_score": 0.0, "distance": 999.0, "is_match": False,
                    "report": "Face template outdated or invalid; أعد تسجيل بصمة الوجه."}
        similarity = float(np.clip(np.dot(left, right), -1, 1))
        score = max(0.0, min(100.0, similarity * 100))
        match = similarity >= threshold
        report = (f"Face ID match confirmed ({score:.1f}%)" if match else
                  f"Face identity uncertain — manual review required ({score:.1f}%)" if similarity >= 0.45 else
                  f"FACE MISMATCH — manual review required ({score:.1f}%)")
        return {"similarity_score": round(score, 1), "distance": round(1 - similarity, 4),
                "cosine": round(similarity, 4), "is_match": match, "report": report}

    def verify_image(self, stored_embedding: list[float], image_bytes: bytes, threshold=None) -> dict:
        extracted = self.extract_embedding(image_bytes)
        return {**self.verify_face(stored_embedding, extracted["embedding"], threshold),
                "num_faces": extracted["num_faces"], "det_score": extracted["det_score"], "pose": None}


face_biometrics_service = FaceBiometricsService()
