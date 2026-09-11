"""Face ID verification — compares 128-dim face-api.js descriptors."""
import numpy as np

EMBEDDING_DIM = 128
# face-api.js default: euclidean distance < 0.6 = same person
DEFAULT_THRESHOLD = 0.6


class FaceBiometricsService:
    def verify_face(
        self,
        stored_embedding: list[float],
        current_embedding: list[float],
        threshold: float = DEFAULT_THRESHOLD,
    ) -> dict:
        vec1 = np.array(stored_embedding, dtype=np.float32)
        vec2 = np.array(current_embedding, dtype=np.float32)

        if vec1.shape != vec2.shape or len(vec1) != EMBEDDING_DIM:
            return {
                "similarity_score": 0.0,
                "distance": 999.0,
                "is_match": False,
                "report": f"Face embedding dimension mismatch ({vec1.shape} vs {vec2.shape}). Re-enroll Face ID.",
            }

        distance = float(np.linalg.norm(vec1 - vec2))
        # Map distance to 0–100% (0 at threshold+, 100 at 0 distance)
        score = max(0.0, min(100.0, (1.0 - distance / threshold) * 100.0))
        is_match = distance < threshold

        if is_match:
            report = f"Face ID match confirmed ({score:.1f}%)"
        else:
            report = f"⚠️ FACE MISMATCH: Face does not match enrolled Face ID ({score:.1f}%, distance {distance:.3f})"

        return {
            "similarity_score": round(score, 1),
            "distance": round(distance, 4),
            "is_match": is_match,
            "report": report,
        }


face_biometrics_service = FaceBiometricsService()
