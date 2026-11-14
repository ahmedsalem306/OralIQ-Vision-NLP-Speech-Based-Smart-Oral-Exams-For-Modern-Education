"""Bound password-login work without making a school's valid accounts share 20 attempts.

Process-local by design: deployment runs one API worker, like the other HTTP limits.
No passwords/emails are retained in these counters; account keys are SHA-256 digests.
"""
from collections import Counter, deque
from contextlib import contextmanager
from dataclasses import dataclass
import hashlib
import threading
import time

import anyio
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm

LOGIN_PATH = "/api/v1/login/access-token"


def limited():
    return HTTPException(429, detail={
        "code": "LOGIN_RATE_LIMITED", "message": "محاولات دخول كتير في وقت قصير. استنى دقيقة وجرّب تاني.",
        "message_en": "Too many sign-in attempts. Wait a minute and try again.",
    }, headers={"Retry-After": "60"})


def busy():
    return HTTPException(503, detail={
        "code": "LOGIN_BUSY", "message": "في ضغط على تسجيل الدخول. حاول تاني بعد ثواني.",
        "message_en": "Sign-in is busy. Please retry in a few seconds.",
    }, headers={"Retry-After": "2"})


@dataclass(eq=False)
class LoginTicket:
    ip: str
    gate: "PasswordLoginGate"
    started: bool = False
    rejected: bool = False
    closed: bool = False
    executing: bool = False
    cleanup_requested: bool = False


class PasswordLoginGate:
    def __init__(self, *, ip_limit=600, account_limit=5, failed_ip_limit=20,
                 concurrency=4, max_pending=64, wait_seconds=15, max_buckets=50_000,
                 clock=time.monotonic):
        self.ip_limit, self.account_limit, self.failed_ip_limit = ip_limit, account_limit, failed_ip_limit
        self.max_pending, self.wait_seconds, self.max_buckets = max_pending, wait_seconds, max_buckets
        self.clock = clock
        self.slots = anyio.CapacityLimiter(concurrency)
        self._hash_slots = threading.BoundedSemaphore(concurrency)
        self._ip_attempts, self._account_attempts, self._failures = {}, {}, {}
        self._inflight = Counter()
        self._pending = 0
        self._lock = threading.Lock()

    def _bucket(self, store, key, now):
        if key not in store:
            if len(store) >= self.max_buckets:
                for old_key in list(store):
                    history = store[old_key]
                    while history and history[0] <= now - 60:
                        history.popleft()
                    if not history and not self._inflight.get(old_key):
                        del store[old_key]
                if len(store) >= self.max_buckets:
                    raise limited()  # never evict a live throttle to admit fresh attack keys
            store[key] = deque()
        history = store[key]
        while history and history[0] <= now - 60:
            history.popleft()
        return history

    def _take(self, store, key, limit):
        now = self.clock()
        history = self._bucket(store, key, now)
        if len(history) >= limit:
            raise limited()
        history.append(now)

    def preflight(self, ip):
        """Before parsing a login body; counts successful attempts as well as failures."""
        with self._lock:
            self._take(self._ip_attempts, ip, self.ip_limit)

    def reserve(self, ip, account):
        with self._lock:
            if self._pending >= self.max_pending:
                raise busy()
            account_key = hashlib.sha256((account or "").strip().lower().encode()).digest()
            self._take(self._account_attempts, account_key, self.account_limit)
            self._pending += 1
            return LoginTicket(ip, self)

    def start(self, ticket):
        """Recheck after queueing; reserve a possible failure so parallel guesses cannot overshoot."""
        with self._lock:
            history = self._bucket(self._failures, ticket.ip, self.clock())
            if len(history) + self._inflight[ticket.ip] >= self.failed_ip_limit:
                raise limited()
            ticket.started = True
            self._inflight[ticket.ip] += 1

    def finish(self, ticket):
        with self._lock:
            if ticket.closed:
                return
            if ticket.executing:
                # A disconnected/cancelled request must not forget a still-running hash.
                ticket.cleanup_requested = True
                return
            ticket.closed = True
            self._pending -= 1
            if ticket.started:
                self._inflight[ticket.ip] -= 1
                if ticket.rejected:
                    self._failures[ticket.ip].append(self.clock())
                if not self._inflight[ticket.ip]:
                    del self._inflight[ticket.ip]
                    if not self._failures[ticket.ip]:
                        del self._failures[ticket.ip]

    @contextmanager
    def work(self, ticket):
        """Bound actual synchronous work even if its awaiting HTTP task is cancelled."""
        with self._lock:
            if ticket.closed or ticket.executing:
                raise busy()
            ticket.executing = True
        acquired = False
        try:
            acquired = self._hash_slots.acquire(timeout=self.wait_seconds)
            if not acquired:
                raise busy()
            yield
        finally:
            if acquired:
                self._hash_slots.release()
            with self._lock:
                ticket.executing = False
                deferred = ticket.cleanup_requested
            if deferred:
                self.finish(ticket)


def gate_for(request: Request):
    # Per app: standalone API tests and separately hosted applications do not share state.
    gate = getattr(request.app.state, "password_login_gate", None)
    if gate is None:
        gate = request.app.state.password_login_gate = PasswordLoginGate()
    return gate


async def password_login_permit(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    gate = gate_for(request)
    ip = getattr(request.state, "password_login_ip", request.client.host if request.client else "unknown")
    if not getattr(request.state, "password_login_preflight", False):
        gate.preflight(ip)  # safe for a standalone app without the main HTTP middleware
    ticket = gate.reserve(ip, form_data.username)
    acquired = False
    try:
        try:
            with anyio.fail_after(gate.wait_seconds):
                await gate.slots.acquire_on_behalf_of(ticket)
            acquired = True
        except TimeoutError:
            raise busy() from None
        gate.start(ticket)
        yield ticket
    finally:
        if acquired:
            gate.slots.release_on_behalf_of(ticket)
        gate.finish(ticket)
