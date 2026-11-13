"""Eye-region visibility only. Not iris recognition, gaze estimation or liveness."""
from threading import local
from app.core.media_limits import check_image_dimensions

_thread = local()


def observe(content: bytes):
    import cv2
    import numpy as np
    check_image_dimensions(content)
    image = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError("Invalid frame")
    height, width = image.shape
    image = cv2.resize(image, (min(640, width), max(1, round(height * min(640, width) / width))))
    classifier = getattr(_thread, "classifier", None)
    if classifier is None:
        classifier = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml")
        if classifier.empty():
            return {"status": "unavailable", "eyes_visible": None, "identity_verified": False}
        _thread.classifier = classifier
    boxes = classifier.detectMultiScale(image, scaleFactor=1.1, minNeighbors=6, minSize=(16, 16))
    # Require two plausible horizontally aligned regions; false positives/negatives remain possible.
    visible = any(abs(float(a[1] + a[3]/2 - b[1] - b[3]/2)) < max(a[3], b[3]) * .45
                  and abs(float(a[0] - b[0])) > max(a[2], b[2])
                  for i, a in enumerate(boxes) for b in boxes[i+1:])
    return {"status": "eyes_visible" if visible else "unavailable", "eyes_visible": True if visible else None,
            "identity_verified": False, "gaze_direction": None, "requires_manual_review": True}
