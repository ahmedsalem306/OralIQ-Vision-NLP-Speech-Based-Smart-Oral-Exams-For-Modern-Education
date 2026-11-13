"""Bound CPU inference in the single API process; never treat overload as an identity failure."""
import os
from threading import BoundedSemaphore, Lock

import anyio
from fastapi import HTTPException

_raw = os.environ.get("BIOMETRIC_MAX_CONCURRENCY", "2")
_slots = BoundedSemaphore(max(1, min(8, int(_raw) if _raw.isdigit() else 2)))


async def run_biometric(function, *args):
    slots = _slots
    if not slots.acquire(blocking=False):
        raise HTTPException(status_code=503, headers={"Retry-After": "2"}, detail={
            "code": "BIOMETRIC_BUSY",
            "message": "خدمة التحقق مشغولة مؤقتًا. حاول مرة أخرى.",
            "message_en": "Identity checks are temporarily busy. Please retry.",
        })
    lock = Lock()
    started = released = False

    def invoke():
        nonlocal started, released
        with lock:
            if released:  # cancelled before a queued thread began: do not run the model
                return None
            started = True
        try:
            return function(*args)
        finally:
            with lock:
                slots.release()
                released = True

    try:
        return await anyio.to_thread.run_sync(invoke, abandon_on_cancel=False)
    except BaseException:
        # Raw asyncio cancellation can interrupt the await even while its OS thread runs.
        # Once started, only that thread may release capacity.
        with lock:
            if not started and not released:
                slots.release()
                released = True
        raise
