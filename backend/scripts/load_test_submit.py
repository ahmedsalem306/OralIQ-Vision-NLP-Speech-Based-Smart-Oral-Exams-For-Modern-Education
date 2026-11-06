"""Staging only: submit real-length recordings from distinct enrolled test students.

students.load.json is a list of {token, question_id, exam_key}. Never commit that file.
Each run consumes one attempt per account and writes real grading jobs. Models run on the server.
"""
import argparse
import asyncio
import json
import math
import time
import uuid
from pathlib import Path

import httpx


async def run(args):
    students = json.loads(Path(args.students).read_text(encoding="utf-8"))
    audio = Path(args.audio).read_bytes()
    semaphore = asyncio.Semaphore(args.concurrency)
    latencies, accepted, failures = [], [], {}
    started = time.perf_counter()
    async with httpx.AsyncClient(base_url=args.base_url.rstrip("/"), timeout=180) as client:
        async def send(student):
            async with semaphore:
                headers = {"Authorization": f"Bearer {student['token']}"}
                access = await client.get(f"/api/v1/exams/access-check/{student['exam_key']}", headers=headers)
                if access.status_code != 200:
                    failures[f"access:{access.status_code}"] = failures.get(f"access:{access.status_code}", 0) + 1
                    return
                before = time.perf_counter()
                response = await client.post("/api/v1/exams/submit", headers=headers,
                    data={"question_id": str(student["question_id"]), "student_name": "Load test",
                          "student_number": str(uuid.uuid4()), "submission_key": str(uuid.uuid4())},
                    files={"audio": (Path(args.audio).name, audio, "audio/webm")})
                latencies.append(time.perf_counter() - before)
                if response.status_code == 202:
                    accepted.append((response.json()["id"], headers))
                else:
                    key = f"submit:{response.status_code}"
                    failures[key] = failures.get(key, 0) + 1

        # Print aggregated counts only; never print the bearer tokens or student payloads.
        results = await asyncio.gather(*(send(s) for s in students), return_exceptions=True)
        transport_errors = sum(isinstance(r, Exception) for r in results)
        ordered = sorted(latencies)
        print(json.dumps({"students": len(students), "accepted": len(accepted), "failures": failures,
                          "transport_errors": transport_errors,
                          "submit_p95_seconds": ordered[max(0, math.ceil(len(ordered) * .95) - 1)] if ordered else None,
                          "submit_phase_seconds": round(time.perf_counter() - started, 2)}))
        pending, completed, failed = list(accepted), 0, 0
        deadline = time.monotonic() + args.wait_seconds
        while pending and time.monotonic() < deadline:
            remaining = []
            for submission_id, headers in pending:
                response = await client.get(f"/api/v1/exams/submissions/{submission_id}/grading", headers=headers)
                body = response.json() if response.status_code == 200 else {}
                status = body.get("grading_status") or body.get("status")
                if status == "completed":
                    completed += 1
                elif status == "failed":
                    failed += 1
                else:
                    remaining.append((submission_id, headers))
            pending = remaining
            if pending:
                await asyncio.sleep(5)
        print(json.dumps({"graded": completed, "failed": failed, "still_pending": len(pending),
                          "total_seconds": round(time.perf_counter() - started, 2)}))
        return 1 if failures or transport_errors or failed or pending else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="Staging API origin, without /api/v1")
    parser.add_argument("--students", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--wait-seconds", type=int, default=1800)
    parser.add_argument("--confirm-staging", action="store_true", required=True)
    args = parser.parse_args()
    if args.concurrency < 1 or args.wait_seconds < 1:
        parser.error("Concurrency and wait time must be positive")
    raise SystemExit(asyncio.run(run(args)))
