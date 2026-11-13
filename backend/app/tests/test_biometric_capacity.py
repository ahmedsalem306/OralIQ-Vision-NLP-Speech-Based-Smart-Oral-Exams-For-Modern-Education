import asyncio
from threading import BoundedSemaphore, Event

import pytest
from fastapi import HTTPException

from app.core import biometric_capacity as capacity


def test_overload_is_retryable_without_running_inference_and_slot_recovers(monkeypatch):
    monkeypatch.setattr(capacity, "_slots", BoundedSemaphore(1))
    entered, finish = Event(), Event()
    called = []

    def slow_model():
        entered.set()
        if not finish.wait(5):
            raise TimeoutError("Test inference did not receive release")
        return "verified"

    async def scenario():
        first = asyncio.create_task(capacity.run_biometric(slow_model))
        try:
            for _ in range(100):
                if entered.is_set():
                    break
                await asyncio.sleep(.01)
            assert entered.is_set()
            with pytest.raises(HTTPException) as rejected:
                await capacity.run_biometric(lambda: called.append("must not run"))
            assert rejected.value.status_code == 503
            assert rejected.value.detail["code"] == "BIOMETRIC_BUSY"
            assert rejected.value.headers["Retry-After"] == "2"
        finally:
            finish.set()
            assert await first == "verified"
        assert await capacity.run_biometric(lambda: "next") == "next"

    asyncio.run(scenario())
    assert not called


def test_model_failure_releases_its_slot(monkeypatch):
    monkeypatch.setattr(capacity, "_slots", BoundedSemaphore(1))

    def broken_model():
        raise RuntimeError("model failure")

    async def scenario():
        with pytest.raises(RuntimeError):
            await capacity.run_biometric(broken_model)
        assert await capacity.run_biometric(lambda: True)
    asyncio.run(scenario())


def test_cancelled_http_task_cannot_release_an_active_inference_slot(monkeypatch):
    monkeypatch.setattr(capacity, "_slots", BoundedSemaphore(1))
    entered, finish = Event(), Event()

    def slow_model():
        entered.set()
        assert finish.wait(5)

    async def scenario():
        task = asyncio.create_task(capacity.run_biometric(slow_model))
        try:
            while not entered.is_set():
                await asyncio.sleep(.01)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
            with pytest.raises(HTTPException) as rejected:
                await capacity.run_biometric(lambda: True)
            assert rejected.value.status_code == 503
        finally:
            finish.set()
        for _ in range(100):
            try:
                assert await capacity.run_biometric(lambda: "available") == "available"
                return
            except HTTPException:
                await asyncio.sleep(.01)
        pytest.fail("Inference slot did not recover")
    asyncio.run(scenario())
