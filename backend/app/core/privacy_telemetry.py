"""Allowlisted error metadata only: exam media and answers must never enter telemetry."""
import re


def private_error_event(event, hint=None):
    safe = {key: event[key] for key in (
        "event_id", "timestamp", "level", "platform", "release", "environment"
    ) if key in event}
    values = (event.get("exception") or {}).get("values") or []
    safe_types = []
    for item in values:
        kind = item.get("type", "Error") if isinstance(item, dict) else "Error"
        if not isinstance(kind, str) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.]{0,119}", kind):
            kind = "Error"
        safe_types.append({"type": kind, "value": "Details omitted to protect exam privacy"})
    safe["exception"] = {"values": safe_types or [{"type": "Error", "value": "Details omitted to protect exam privacy"}]}
    return safe
