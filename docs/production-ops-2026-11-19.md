# Account correction and host checks — 19 November 2026 (Cairo)

Implementation commit: `8abb8fc60153a1638dad94cadb1e89779fbd1eda`.
Runtime image: `oraliq-backend:ops-ready-20261119`.
Frontend: `/srv/oraliq-web/releases/ops-ready-20261119`.

## Live changes

- Settings now offers correction between student and lecturer for an authenticated,
  email-verified, unused account. Public signup still cannot change an existing
  account. The correction endpoint rejects admin/HR, another user id, stale choices,
  subscriptions/usage allowances, teams and exam history. It preserves identity,
  enrolled biometrics and preferences; it does not delete records or reset quotas.
- The correction increments token version and returns a new session for this
  device. Other sessions must sign in again. PostgreSQL row locking serializes
  competing correction requests and checks the authenticated token version again.
- Host operation checks run about every two minutes. They check local API health,
  the public HTTPS status response, production containers, read-only DB access,
  grading/mail delays, disk space, backup failure and backup success freshness.
- The offsite backup unit now records successful completion through an
  `ExecStartPost` hook. Monitoring was initially seeded from the already verified
  18 November cloud download and isolated restore, rather than assuming a local
  commit file alone proved remote success. This does not claim the first scheduled
  03:30 Cairo run had already happened at rollout time.
- Host checks are enabled. **Email delivery remains disabled**: the owner asked
  whether alerts include subscription renewal/API balance, which is not approval
  to send mail. The ready test message and persistent delivery limits are documented
  in `ops/monitor/README.md`. No test or incident mail was sent for this change.

## Validation

- 98 focused backend tests passed in an isolated Linux container with networking
  disabled, including 24 new account-correction tests.
- Seven notification-state tests passed, covering disabled delivery, transient
  incidents, recovery, repeated incidents, hourly/daily limits and SMTP failure.
- Fifteen production-mode HTTP checks passed against a fresh disposable PostgreSQL
  database. They exercised registration, verification, password login, duplicate
  signup protection, competing corrections with one winner, old-token revocation,
  admin rejection and used-account rejection. The test DB/container were removed.
  Verification messages stayed in the encrypted test outbox; none were delivered.
- Frontend typecheck, lint and production/prerender build passed. Lint reported
  23 existing warnings and no errors. This release did not include a new interactive
  browser walkthrough or a real Google SSO login.
- Rollout paused new exam admission and checked there were no active attempts or
  queued/processing grading jobs before replacing the API, worker and mailer.
  No database schema change or production fixture account was needed.
- The deployed settings route and Google configuration return HTTP 200. The new
  correction route requires authentication. Accounts/exams are available; paid
  checkout remains closed. Host checks report no current issues.

## Remaining scope

OpenAI integration and paid audio testing are deferred by the owner until funding.
The active speech provider remains Groq under the existing conservative limits.
This release made no paid audio requests and changed no provider budget settings.

Host checks cannot notify during whole-VPS/network downtime; an external uptime
monitor remains separate. Renewal dates, invoices, auto-renewal settings and API
credit balances are not read or monitored by this script. A queue delay caused by
an ASR limit can trigger a delay incident after 30 minutes, but this is not a
low-balance warning or an exact remaining-credit report. Do not market the current
server as validated for 500 simultaneous live-camera exams.

Operational evidence is retained in root-only server checkpoints and ignored
`loadtest-artifacts/ops-ready-20261119/`; secrets and raw student data are not in
this document or Git.
