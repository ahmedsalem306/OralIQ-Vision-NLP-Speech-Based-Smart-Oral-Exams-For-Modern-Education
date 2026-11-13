import type { ErrorEvent } from "@sentry/react";

/** Keep error categories, never requests, answers, biometric data or stack locals. */
export function privateErrorEvent(event: ErrorEvent): ErrorEvent {
    const values = event.exception?.values?.map(item => ({
        type: /^[A-Za-z_][A-Za-z0-9_.]{0,119}$/.test(item.type ?? "") ? item.type : "Error",
        value: "Details omitted to protect exam privacy",
    }));
    return {
        type: undefined,
        event_id: event.event_id,
        timestamp: event.timestamp,
        level: event.level,
        platform: event.platform,
        release: event.release,
        environment: event.environment,
        exception: { values: values?.length ? values : [{ type: "Error", value: "Details omitted to protect exam privacy" }] },
    };
}
