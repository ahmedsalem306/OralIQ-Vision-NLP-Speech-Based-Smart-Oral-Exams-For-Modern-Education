"""Exercise 500 simulated HTTP clients against mocks. This never benchmarks a real server."""
import argparse
import asyncio
import re

import httpx

from scripts.school_load_test import Config, Runner, write_report


def mock_school(students=500, *, reject_first=False, lose_response=False, grading_status="completed"):
    accounts = [{"id": i + 100, "email": f"student-{i}@loadtest.invalid", "password": "MOCK-password",
                 "token": f"MOCK-student-{i}"} for i in range(students)]
    owner = {"id": 1, "email": "owner@loadtest.invalid", "token": "MOCK-owner"}
    manifest = {"allowed_origin": "http://localhost", "biometric_mode": "scaffold_unenrolled",
                "lecturer": owner, "metrics_admin": {"token": "MOCK-admin"},
                "exam": {"key": "mock-exam", "question_ids": [11, 22], "question_seconds": 180},
                "students": accounts}
    identities = {f"Bearer {account['token']}": account for account in [owner, *accounts]}
    accepted, attempts, seen_keys = {}, {}, []

    async def handle(request):
        path = request.url.path
        if path.endswith("/users/me"):
            account = identities.get(request.headers.get("Authorization"))
            return httpx.Response(200, json={"id": account["id"], "email": account["email"]}) if account else httpx.Response(401)
        if path.endswith("/login/access-token"):
            from urllib.parse import parse_qs
            email = parse_qs(request.content.decode())["username"][0]
            account = next(account for account in accounts if account["email"] == email)
            return httpx.Response(200, json={"access_token": account["token"]})
        if "/questions/by-group/" in path:
            return httpx.Response(200, json=[{"id": 11}, {"id": 22}])
        if "/access-check/" in path:
            return httpx.Response(200, json={"allowed": True, "session": {"id": 1}})
        if path.endswith("/face/verify"):
            return httpx.Response(200, json={"is_match": True})
        if path.endswith("/grading/metrics"):
            return httpx.Response(200, json={"queued": 0, "processing": 0, "completed": len(accepted), "failed": 0})
        if path.endswith("/exams/submit"):
            key = re.search(rb'name="submission_key"\r\n\r\n([^\r]+)', request.content).group(1).decode()
            question = re.search(rb'name="question_id"\r\n\r\n([^\r]+)', request.content).group(1).decode()
            seen_keys.append((key, question))
            attempts[key] = attempts.get(key, 0) + 1
            if reject_first and attempts[key] == 1:
                return httpx.Response(503, headers={"Retry-After": "0"}, json={"detail": {"code": "GRADING_CAPACITY_REACHED"}})
            fresh = key not in accepted
            accepted.setdefault(key, len(accepted) + 1)
            if lose_response and attempts[key] == 1:
                raise httpx.ReadTimeout("Mock lost response", request=request)
            return httpx.Response(202 if fresh else 200, json={"id": accepted[key], "grading_status": "queued"})
        if "/submissions/by-key/" in path:
            key = path.split("/by-key/", 1)[1].split("/")[0]
            return httpx.Response(200, json={"id": accepted[key], "grading_status": grading_status}) if key in accepted else httpx.Response(404)
        if "/submissions/" in path and path.endswith("/grading"):
            return httpx.Response(200, json={"grading_status": grading_status})
        raise AssertionError(f"Unexpected mock operation: {request.method} {path}")
    return manifest, httpx.MockTransport(handle), accepted, seen_keys


async def selfcheck(students=500):
    manifest, transport, _, _ = mock_school(students)
    config = Config("http://localhost", students=students, questions=2, question_seconds=.002,
                    ramp_seconds=0, submit_window_seconds=0, face_interval_seconds=.001,
                    session_interval_seconds=.001, poll_interval_seconds=.001, metrics_interval_seconds=.1,
                    wait_seconds=2, max_inflight=500, submit_attempts=1)
    result = await Runner(config, manifest, [b"MOCK-audio-1", b"MOCK-audio-2"], [b"MOCK-face"], transport=transport).run()
    result["intended_real_scenario"] = {"students": students, "questions": 2, "question_seconds": 180}
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    result = asyncio.run(selfcheck())
    write_report(result, args.report)
    print(f"MOCK ONLY: {result['accepted_answers']}/{result['expected_answers']} received; "
          f"{result['completed']} simulated grades. Not a server benchmark.")
    raise SystemExit(0 if result["run_passed_transport_checks"] else 1)
