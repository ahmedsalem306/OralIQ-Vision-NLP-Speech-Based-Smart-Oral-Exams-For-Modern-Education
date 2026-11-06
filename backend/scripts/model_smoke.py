"""Real CPU model smoke check. Requires explicit cache location; no implicit home-directory cache."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import tempfile
import time


def configure_cache(root, allow_download=False):
    root = Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    for name, relative in {"HF_HOME": "huggingface", "TRANSFORMERS_CACHE": "huggingface/transformers",
                           "HF_HUB_CACHE": "huggingface/hub", "HUGGINGFACE_HUB_CACHE": "huggingface/hub",
                           "INSIGHTFACE_HOME": "insightface", "TORCH_HOME": "torch", "GAZE_MODEL_DIR": "gaze",
                           "XDG_CACHE_HOME": "system", "NUMBA_CACHE_DIR": "numba", "MPLCONFIGDIR": "matplotlib"}.items():
        os.environ[name] = str(root / relative)
    os.environ["HF_HUB_OFFLINE"] = "0" if allow_download else "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "0" if allow_download else "1"
    if not allow_download and not list((root / "insightface" / "models" / "buffalo_sc").glob("*.onnx")):
        raise ValueError("Face model cache is missing. Preload it or explicitly allow model downloads")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--face-image", required=True)
    parser.add_argument("--reference-text", required=True, help="UTF-8 Arabic model answer file")
    parser.add_argument("--cache-dir", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--allow-model-download", action="store_true")
    args = parser.parse_args()
    if any(not Path(path).is_file() for path in (args.audio, args.face_image, args.reference_text)):
        parser.error("Supply existing input files before loading models")
    if Path(args.audio).stat().st_size > 40 * 1024**2 or Path(args.face_image).stat().st_size > 8 * 1024**2:
        parser.error("Input exceeds the service's upload limits")
    configure_cache(args.cache_dir, args.allow_model_download)
    from app.core.media_limits import decode_audio_bounded
    from app.services.speech_ai import speech_analyzer
    from app.services.nlp_ai import nlp_analyzer
    from app.services.voice_ai import voice_service
    from app.services.face_biometrics import face_biometrics_service
    report = {"kind": "real_model_smoke", "device": "cpu", "whisper_model": speech_analyzer.MODEL_SIZE,
              "timings_seconds": {}, "checks": {}, "is_capacity_test": False}
    work_root = Path(args.cache_dir).resolve() / "smoke-work"
    work_root.mkdir(parents=True, exist_ok=True)
    work = tempfile.TemporaryDirectory(dir=work_root)
    copied_audio = Path(work.name) / ("input" + Path(args.audio).suffix)
    shutil.copyfile(args.audio, copied_audio)
    try:
        waveform = decode_audio_bounded(str(copied_audio))
        report["audio_seconds"] = round(len(waveform) / 16000, 3)
        reference = Path(args.reference_text).read_text(encoding="utf-8")
        start = time.perf_counter()
        fluency = speech_analyzer.analyze_fluency(str(copied_audio), hint=reference)
        report["timings_seconds"]["whisper"] = round(time.perf_counter() - start, 3)
        report["checks"]["transcript_nonempty"] = bool(fluency.get("transcript", "").strip())
        start = time.perf_counter()
        score = nlp_analyzer.evaluate_answer(fluency["transcript"], reference)
        report["timings_seconds"]["sbert"] = round(time.perf_counter() - start, 3)
        report["checks"]["sbert_returned_score"] = nlp_analyzer.is_ready() and isinstance(score.get("score"), (int, float)) and math.isfinite(score["score"])
        start = time.perf_counter()
        embedding = voice_service.extract_embedding(str(copied_audio))
        report["timings_seconds"]["voice"] = round(time.perf_counter() - start, 3)
        report["checks"]["resemblyzer_ready"] = voice_service.is_ready() and len(embedding) == 256 and all(math.isfinite(v) for v in embedding)
        start = time.perf_counter()
        face = face_biometrics_service.extract_embedding(Path(args.face_image).read_bytes())
        report["timings_seconds"]["face"] = round(time.perf_counter() - start, 3)
        report["checks"]["single_face_embedding"] = face.get("num_faces") == 1 and len(face["embedding"]) == 512
        report["audio_sha256"] = hashlib.sha256(Path(args.audio).read_bytes()).hexdigest()
    except Exception as error:
        report["error_type"] = type(error).__name__  # never include embeddings, credentials or transcripts
        report["checks"]["pipeline_completed"] = False
    finally:
        work.cleanup()
    report["passed"] = bool(report["checks"]) and all(report["checks"].values())
    output = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
