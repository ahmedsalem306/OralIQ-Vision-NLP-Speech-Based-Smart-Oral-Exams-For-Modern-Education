"""Independent SMTP worker; no speech/vision model imports or real-message test fixtures."""
import json
import signal
import sys
import threading
import time
from datetime import timedelta

from app.core.database import SessionLocal
from app.models.email_outbox import EmailDeliveryState
from app.services import email_delivery


def healthy():
    try:
        with SessionLocal() as db:
            state = db.get(EmailDeliveryState, 1)
            return bool(state and state.last_seen_at and state.last_seen_at > email_delivery.utcnow() - timedelta(seconds=90))
    except Exception:
        return False


def main():
    if "--healthcheck" in sys.argv:
        raise SystemExit(0 if healthy() else 1)
    if not email_delivery.queued_delivery():
        raise SystemExit("Email worker requires queued delivery")
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    last_check, last_prune, last_issues = 0.0, 0.0, None
    while not stop.is_set():
        try:
            worked = email_delivery.process_one(SessionLocal)
            now = time.monotonic()
            if now - last_check >= 30:
                with SessionLocal() as db:
                    report = email_delivery.metrics(db)
                if report["issues"] != last_issues:
                    print(json.dumps({"event": "email_delivery_status", "issues": report["issues"],
                                      "pending": report["pending"]}), flush=True)
                    last_issues = report["issues"]
                last_check = now
            if now - last_prune >= 3600:
                with SessionLocal() as db:
                    email_delivery.prune(db)
                last_prune = now
            stop.wait(.2 if worked else 1)
        except Exception as error:
            # Provider replies, recipients, tokens and exception messages are excluded.
            print(json.dumps({"event": "email_worker_error", "type": type(error).__name__}), flush=True)
            stop.wait(5)


if __name__ == "__main__":
    main()
