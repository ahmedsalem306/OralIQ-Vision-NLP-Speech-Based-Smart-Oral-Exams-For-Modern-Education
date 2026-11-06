"""Enroll one consenting pilot on the isolated staging API before cloning its test identity."""
import argparse
import json
from pathlib import Path

import httpx

from scripts.school_load_test import Config


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--accounts", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--face-images", nargs="+", required=True)
    parser.add_argument("--confirm-staging", action="store_true", required=True)
    args = parser.parse_args()
    manifest = json.loads(Path(args.accounts).read_text(encoding="utf-8"))
    Config(manifest["allowed_origin"]).validate()
    if len(manifest["students"]) != 1 or not 3 <= len(args.face_images) <= 10:
        parser.error("Use a one-student scaffold and 3–10 consenting face frames")
    pilot = manifest["students"][0]
    if not pilot["email"].endswith("@loadtest.invalid"):
        parser.error("Only the isolated pilot fixture may be enrolled")
    if (not Path(args.audio).is_file() or Path(args.audio).stat().st_size > 40 * 1024**2
            or any(not Path(path).is_file() or Path(path).stat().st_size > 8 * 1024**2 for path in args.face_images)):
        parser.error("Supply audio <=40 MiB and face images <=8 MiB each")
    headers = {"Authorization": f"Bearer {pilot['token']}"}
    with httpx.Client(base_url=manifest["allowed_origin"], headers=headers, timeout=180, follow_redirects=False) as client:
        response = client.get("/api/v1/users/me")
        response.raise_for_status()
        if response.json().get("email") != pilot["email"] or response.json().get("id") != pilot["id"]:
            raise ValueError("Pilot identity mismatch")
        files = [("images", ("frame.jpg", Path(path).read_bytes(), "image/jpeg")) for path in args.face_images]
        response = client.post("/api/v1/face/enroll", files=files)
        response.raise_for_status()
        response = client.post("/api/v1/voice/enroll", files={"audio": ("enrollment.wav", Path(args.audio).read_bytes(), "audio/wav")})
        response.raise_for_status()
        status = client.get("/api/v1/voice/status")
        status.raise_for_status()
        if not status.json().get("biometrics_complete") or not status.json().get("engine_ready"):
            raise ValueError("Real face/Resemblyzer enrollment did not complete")
    print("Pilot enrolled. Use its loadtest.invalid email as --identity-user-email on the staging fixture tool.")


if __name__ == "__main__":
    main()
