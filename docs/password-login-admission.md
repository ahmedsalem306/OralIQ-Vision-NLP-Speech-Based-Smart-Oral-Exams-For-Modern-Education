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

## Validation and private rollout — November 15

- Actual isolated HTTP probe offered 500 valid password logins over 60 seconds from
  one IP, with the real 600,000-round password hashes. All 500 logged in and all 500
  authenticated `/users/me` checks passed; zero transport errors. Final completion
  was 63.29 seconds; login p50 0.5423 seconds, p95 5.0856 seconds, max 5.5722 seconds.
  The full suite was running separately on the same VPS during this probe.
- Repeating one account hit its fifth-attempt budget. Twenty wrong passwords across
  distinct nonexistent accounts were checked, then further valid/forged-header attempts
  from that IP returned 429. Registration's existing strict IP limiter still passes tests.
- The probe API used `--no-proxy-headers` and `TRUST_PROXY=0`. Initially, Uvicorn's own
  default trusted-loopback proxy handling changed the client before app middleware;
  that probe configuration was corrected and all protection checks rerun. The candidate
  remains behind its existing Nginx, which must overwrite client identity headers;
  the private API port is not a public entry point.
- Full Linux/Python 3.12/PostgreSQL suite: **427 passed, 0 skipped**, in 224.13 seconds.
  The first run had one mock driver check expire on a 50-ms test-only observation window;
  successful mock retry observation now allows one second, and the full suite was rerun.
  No application deadline, password-hash cost or real benchmark timeout was relaxed.
- An actual HTTP workflow with ten fixture students/two questions passed fourteen checks:
  scheduled admission, continued sittings after close, covered-mode lecturer review,
  twenty unique accepted answers with idempotent retries, result isolation, manual
  publication and successful-audio cleanup. Enrollment vectors and one-second audio were
  synthetic and inference simulated. It proves backend workflow, not human identity,
  real model quality, six-minute recordings, browser behavior or exam-cohort capacity.
- Image `fc8ba0e` passed the recovery smoke and a verified 18-table pre-release archive
  before private rollout. API/mailer health and worker running state pass. Public HTTPS
  remains maintenance 503; the Vercel frontend is not cut over.
- Browser UI verification did not complete: Computer Use could not determine Chrome's
  URL confidently enough to enforce its policy and stopped. No browser coverage is claimed.
