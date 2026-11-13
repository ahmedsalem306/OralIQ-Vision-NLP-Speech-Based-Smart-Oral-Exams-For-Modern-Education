import json

from app.core.privacy_telemetry import private_error_event


def test_only_error_metadata_leaves_the_service():
    secret = "PRIVATE-EXAM-ANSWER-AND-BIOMETRICS"
    event = {"event_id": "123", "level": "error", "environment": "test",
             "request": {"data": secret, "headers": {"Authorization": secret}},
             "extra": {"audio": secret}, "user": {"email": secret},
             "breadcrumbs": [{"message": secret}], "contexts": {"trace": {"data": secret}},
             "exception": {"values": [{"type": "RuntimeError", "value": secret,
                                         "stacktrace": {"frames": [{"vars": {"embedding": secret}}]}}]}}
    safe = private_error_event(event)
    assert secret not in json.dumps(safe)
    assert safe["exception"]["values"][0]["type"] == "RuntimeError"
    assert safe["event_id"] == "123"
    assert set(safe) == {"event_id", "level", "environment", "exception"}
    assert event["request"]["data"] == secret  # scrubber must not mutate application objects


def test_unstructured_messages_and_sensitive_exception_types_are_not_forwarded():
    safe = private_error_event({"message": "private transcript", "exception": {"values": [{"type": "Student: name@example.com"}]}})
    assert "private transcript" not in json.dumps(safe)
    assert safe["exception"]["values"][0]["type"] == "Error"
