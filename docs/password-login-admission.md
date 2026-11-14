# Password login from shared school networks

The old 20-authentication-attempts/IP/minute limit rejected 480 of 500 valid
password logins offered over a minute from one school IP. Password login now has
its own admission policy; registration, Google login and email verification keep
their existing strict IP limit. Other anonymous/authenticated API limits remain.

| Control | Default |
| --- | --- |
| Password requests per IP, including successes | 600 / rolling 60 seconds |
| Attempts per normalized account, across IPs | 5 / rolling 60 seconds |
| Wrong-password allowance per IP | 20 / rolling 60 seconds |
| Actual concurrent password/authentication work | 4 |
| Active + waiting password requests | 64 |
| Maximum admission wait | 15 seconds |
| Actual login form body, including chunked requests | 16 KiB |

Reservations count in-flight checks against the remaining failure allowance, so
concurrent guesses cannot exceed it. Successful logins release their reservation
without erasing previous failures. Twenty bad passwords from a shared school IP
can consequently still interrupt that school's valid logins for the remaining
window. Account limits apply to existing and unknown accounts identically.
No permanent account lock is created. Rate limits return bilingual 429 with
`Retry-After: 60`; full/expired admission returns 503 with `Retry-After: 2`.
The frontend's existing error presenter already handles these structured messages.

Both async admission and actual synchronous work are bounded. A cancelled HTTP
caller cannot free the CPU bound or forget a still-running wrong-password check:
its in-flight/failure reservation stays until the synchronous handler actually ends.

Counters retain only normalized-account SHA-256 digests and IP buckets in memory.
Each map has at most 50,000 keys; it rejects new keys when full instead of evicting
an active protection. Time windows use a monotonic clock. Credentials are neither
logged nor stored in the gate. Dummy hashing for unknown accounts, password-hash
strength, verified-email checks, disabled-account checks and token versions remain.

This is per-process protection. Keep the configured **single API process/instance**;
horizontal API scaling requires a shared limiter first. A process restart resets
the counters, like the previous middleware. The bounded queue is not a promise of
500 instantaneous logins: test the 500-over-60-seconds school scenario on the VPS.

Security reference: [OWASP login throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling).
Async primitive: [AnyIO capacity limiters](https://anyio.readthedocs.io/en/stable/api.html#capacity-limiter).
