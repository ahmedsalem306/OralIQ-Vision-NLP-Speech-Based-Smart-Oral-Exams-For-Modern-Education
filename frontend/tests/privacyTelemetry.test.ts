import assert from "node:assert/strict";
import test from "node:test";
import { privateErrorEvent } from "../src/lib/privacyTelemetry.ts";

test("error reporting excludes requests, credentials, answer media and stack context", () => {
    const secret = "PRIVATE-EXAM-CONTENT";
    const event = { type: undefined, event_id: "abc", request: { data: secret }, user: { email: secret },
        extra: { audio: secret }, breadcrumbs: [{ message: secret }],
        exception: { values: [{ type: "TypeError", value: secret, stacktrace: { frames: [{ vars: { face: secret } }] } }] } };
    const result = privateErrorEvent(event);
    assert.equal(result.exception?.values?.[0].type, "TypeError");
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.equal(event.request.data, secret);
});
