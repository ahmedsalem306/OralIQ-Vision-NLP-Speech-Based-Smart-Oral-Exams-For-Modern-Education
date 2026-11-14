import asyncio
import threading
import time

import httpx
import pytest
from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.core.request_limits import RequestSizeLimitMiddleware
from app.services.password_login import LoginTicket, PasswordLoginGate, password_login_permit


def completed(gate, ip, email, rejected=False):
    gate.preflight(ip)
    ticket = gate.reserve(ip, email)
    try:
        gate.start(ticket)
        ticket.rejected = rejected
    finally:
        gate.finish(ticket)


def test_500_distinct_valid_accounts_share_school_ip():
    gate = PasswordLoginGate()
    for index in range(500):
        completed(gate, "school", f"student-{index}@example.com")
    assert gate._pending == 0 and not gate._inflight and not gate._failures
    assert len(gate._account_attempts) == 500


def test_account_limit_is_global_and_normalizes_case_and_whitespace():
    gate = PasswordLoginGate()
    for index in range(5):
        completed(gate, f"ip-{index}", " Student@Example.com ")
    with pytest.raises(Exception) as caught:
        completed(gate, "another-ip", "student@example.com")
    assert caught.value.status_code == 429
    assert "student@example.com" not in repr(gate._account_attempts)


def test_ip_attempt_ceiling_counts_successes_too():
    gate = PasswordLoginGate(ip_limit=3)
    for index in range(3):
        completed(gate, "school", str(index))
    with pytest.raises(Exception) as caught:
        gate.preflight("school")
    assert caught.value.status_code == 429


def test_twenty_bad_passwords_block_ip_and_expire_without_success_reset():
    now = [0.0]
    gate = PasswordLoginGate(clock=lambda: now[0])
    for index in range(19):
        completed(gate, "school", str(index), rejected=True)
    completed(gate, "school", "valid-account")
    completed(gate, "school", "last-guess", rejected=True)
    with pytest.raises(Exception) as caught:
        completed(gate, "school", "another-valid-account")
    assert caught.value.status_code == 429
    assert gate._pending == 0
    now[0] = 61
    completed(gate, "school", "valid-account")


def test_inflight_attempts_reserve_failure_budget_atomically():
    gate = PasswordLoginGate(failed_ip_limit=2)
    tickets = [gate.reserve("ip", str(index)) for index in range(3)]
    gate.start(tickets[0])
    gate.start(tickets[1])
    with pytest.raises(Exception) as caught:
        gate.start(tickets[2])
    assert caught.value.status_code == 429
    for ticket in tickets:
        ticket.rejected = True
        gate.finish(ticket)
        gate.finish(ticket)  # cleanup cannot double count/decrement
    assert len(gate._failures["ip"]) == 2
    assert not gate._inflight and gate._pending == 0


def test_counter_capacity_does_not_evict_active_limits():
    now = [0.0]
    gate = PasswordLoginGate(max_buckets=1, account_limit=1, clock=lambda: now[0])
    completed(gate, "ip", "one")
    with pytest.raises(Exception) as caught:
        gate.reserve("ip", "new-key")
    assert caught.value.status_code == 429
    with pytest.raises(Exception):
        gate.reserve("ip", "one")
    now[0] = 61
    completed(gate, "ip", "new-key")
    assert len(gate._account_attempts) == 1


def test_pending_queue_is_bounded_before_creating_more_work():
    gate = PasswordLoginGate(max_pending=2)
    tickets = [gate.reserve("ip", str(index)) for index in range(2)]
    with pytest.raises(Exception) as caught:
        gate.reserve("ip", "third")
    assert caught.value.status_code == 503
    for ticket in tickets:
        gate.finish(ticket)
    assert gate._pending == 0


def test_actual_synchronous_work_has_its_own_concurrency_cap():
    from concurrent.futures import ThreadPoolExecutor
    gate = PasswordLoginGate(concurrency=2)
    lock = threading.Lock()
    active = peak = 0
    def work(index):
        nonlocal active, peak
        ticket = gate.reserve("ip", str(index))
        try:
            gate.start(ticket)
            with gate.work(ticket):
                with lock:
                    active += 1
                    peak = max(peak, active)
                time.sleep(.02)
                with lock:
                    active -= 1
        finally:
            gate.finish(ticket)
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(work, range(8)))
    assert peak == 2 and gate._pending == 0


def test_cancelled_http_caller_keeps_failure_reservation_until_real_hash_finishes():
    async def scenario():
        gate = PasswordLoginGate(concurrency=1)
        app = FastAPI()
        app.state.password_login_gate = gate
        started, release = threading.Event(), threading.Event()
        @app.post("/api/v1/login/access-token")
        def login(ticket: LoginTicket = Depends(password_login_permit)):
            with gate.work(ticket):
                started.set()
                assert release.wait(timeout=5)
                ticket.rejected = True
            return {"fixture": True}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            caller = asyncio.create_task(client.post("/api/v1/login/access-token", data={"username": "one", "password": "fixture"}))
            try:
                for _ in range(100):
                    if started.is_set():
                        break
                    await asyncio.sleep(.01)
                assert started.is_set()
                caller.cancel()
                await asyncio.sleep(.02)
                assert gate._pending == 1 and sum(gate._inflight.values()) == 1
            finally:
                release.set()
            with pytest.raises(asyncio.CancelledError):
                await caller
            for _ in range(100):
                if gate._pending == 0:
                    break
                await asyncio.sleep(.01)
            assert gate._pending == 0 and not gate._inflight
            assert sum(len(history) for history in gate._failures.values()) == 1
    asyncio.run(scenario())


def test_async_admission_queues_without_exceeding_active_cap():
    async def scenario():
        gate = PasswordLoginGate(concurrency=2)
        app = FastAPI()
        app.state.password_login_gate = gate
        active = peak = 0

        @app.post("/api/v1/login/access-token")
        async def login(ticket: LoginTicket = Depends(password_login_permit)):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(.01)
            active -= 1
            return {"ok": True}

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            responses = await asyncio.gather(*(client.post("/api/v1/login/access-token",
                data={"username": f"student-{index}", "password": "fixture"}) for index in range(30)))
        assert all(response.status_code == 200 for response in responses)
        assert peak == 2 and gate._pending == 0 and gate.slots.borrowed_tokens == 0
    asyncio.run(scenario())


@pytest.mark.parametrize("cancel_waiter", [False, True])
def test_wait_timeout_or_cancellation_releases_queue_reservation(cancel_waiter):
    async def scenario():
        gate = PasswordLoginGate(concurrency=1, wait_seconds=.05)
        app = FastAPI()
        app.state.password_login_gate = gate
        started, release = asyncio.Event(), asyncio.Event()

        @app.post("/api/v1/login/access-token")
        async def login(ticket: LoginTicket = Depends(password_login_permit)):
            started.set()
            await release.wait()
            return {"ok": True}

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            first = asyncio.create_task(client.post("/api/v1/login/access-token", data={"username": "one", "password": "fixture"}))
            await started.wait()
            second = asyncio.create_task(client.post("/api/v1/login/access-token", data={"username": "two", "password": "fixture"}))
            await asyncio.sleep(.01)
            if cancel_waiter:
                second.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await second
            else:
                assert (await second).status_code == 503
            assert gate._pending == 1 and gate.slots.borrowed_tokens == 1
            release.set()
            assert (await first).status_code == 200
        assert gate._pending == 0 and gate.slots.borrowed_tokens == 0
    asyncio.run(scenario())


def test_real_login_route_allows_distinct_accounts_and_blocks_repeated_account(client, db, monkeypatch):
    from app.core import security
    from app.models.user import User
    for index in range(30):
        db.add(User(email=f"nat-student-{index}@example.com", full_name="Fixture", role="student",
                    hashed_password="fixture", email_verified=True, is_active=True))
    db.commit()
    monkeypatch.setattr(security, "verify_password", lambda password, hashed: password == "correct")
    monkeypatch.setattr(security.pwd_context, "needs_update", lambda hashed: False)
    for index in range(30):
        result = client.post("/api/v1/login/access-token", data={"username": f"nat-student-{index}@example.com", "password": "correct"})
        assert result.status_code == 200, result.text
    for _ in range(4):
        assert client.post("/api/v1/login/access-token", data={"username": "nat-student-0@example.com", "password": "correct"}).status_code == 200
    blocked = client.post("/api/v1/login/access-token", data={"username": "NAT-STUDENT-0@example.com", "password": "correct"})
    assert blocked.status_code == 429 and blocked.headers["retry-after"] == "60"


def test_blocked_bad_password_ip_never_runs_another_hash(client, monkeypatch):
    from app.main import app
    from app.core import security
    app.state.password_login_gate = PasswordLoginGate(failed_ip_limit=2)
    calls = []
    monkeypatch.setattr(security, "verify_password", lambda *args: calls.append(1) or False)
    for index in range(2):
        assert client.post("/api/v1/login/access-token", data={"username": f"unknown-{index}@example.com", "password": "wrong"}).status_code == 400
    assert client.post("/api/v1/login/access-token", data={"username": "third@example.com", "password": "wrong"}, headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 429
    assert len(calls) == 2


def test_registration_keeps_existing_strict_ip_limit(monkeypatch):
    import app.main as main
    monkeypatch.setattr(main, "auth_rate_limiter", main.RateLimiter(limit=2))
    app = FastAPI()
    app.add_middleware(main.RateLimitMiddleware)
    @app.post("/api/v1/register")
    def register():
        return {"fixture": True}
    with TestClient(app) as client:
        assert [client.post("/api/v1/register").status_code for _ in range(3)] == [200, 200, 429]


@pytest.mark.parametrize("streamed", [False, True])
def test_login_form_body_is_capped_even_without_content_length(streamed):
    async def scenario():
        app = FastAPI()
        app.add_middleware(RequestSizeLimitMiddleware)
        @app.post("/api/v1/login/access-token")
        async def login(request: Request):
            return {"bytes": len(await request.body())}
        async def chunks():
            yield b"x" * 9000
            yield b"x" * 9000
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/login/access-token", content=chunks() if streamed else b"x" * 18000)
        assert response.status_code == 413
    asyncio.run(scenario())
