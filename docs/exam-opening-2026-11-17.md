# Exam access on Contabo — November 17, 2026

Accounts, biometric enrollment and exams are now available at
https://oralliq.com. Paid checkout remains closed pending Kashier Live activation.
The previous accounts-only proxy gate caused the dashboard's generic load error;
it was unrelated to purchasing a Groq plan.

## Deployed behavior

- `/srv/oraliq-web/api-maintenance` is absent. Authenticated question, exam,
  face and voice routes reach the production API on loopback port 18001.
- `/srv/oraliq-web/payments-maintenance` is present. Both checkout aliases,
  including trailing slashes, return `503 PAYMENTS_UNAVAILABLE` without creating
  payments. Billing reads, existing-payment status and callbacks keep their
  existing behavior. The API subdomain still serves maintenance; it does not
  provide an alternate checkout route.
- `/service-status.json` reports accounts/exams `true`, payments `false`.
  The subscription dialog explains that payment activation is pending and
  disables purchase/add-on buttons. Missing/failed availability checks also
  disable purchases; the Enterprise contact action remains available.
- The generic data-load message no longer guesses that a connection or server
  startup caused a failure. The accounts-only banner no longer conflates exam
  maintenance with the independent payment state.

Frontend release: `/srv/oraliq-web/releases/exams-open-20261117-v2`.
Backend API/worker image remains `oraliq-backend:groq-budget-20261116`.
The 33 overlay files passed SHA-256 manifest verification. Archive SHA256:
`3738ba0e0c2c650bad96f5da7e88be0e4dc782de7dbab231d9d3c2be9871cb00`.

## Verification and limits of the evidence

The actual deployed backend image ran against a fresh disposable PostgreSQL
database ending in `_loadtest`, with a fresh signing secret and no mail worker.
One Free lecturer fixture, three student fixtures, two one-minute questions,
and the owner's previously supplied 34.539-second recording exercised:

- Password login, HTTP voice enrollment using the real 256-dimension encoder,
  and recognition of the current SFace template format.
- Opening-time enforcement and omission of reference answers from student data.
- Six accepted uploads, idempotent repeats, and refusal to read another student's
  grading status.
- Six real Groq `whisper-large-v3` transcriptions with fluency/content scoring and
  voice comparisons; all completed, with finite scores and retained audio purged.
- Hidden results before lecturer publication and two own results per student
  after publication. No local Whisper model loaded.

All 14 checks passed. The six-job grading batch took **9.42 seconds**, after
**16.40 seconds** of NLP model loading; the whole fixture flow took **54.45
seconds**. The initial 30-second client timeout was insufficient for first-use
voice enrollment; the completed run used a 115-second timeout, below the
production proxy's 120 seconds. This is a cold-start observation to monitor.

This reused one speaker's same clip, synthetic current-format face templates,
and fixture accounts. It included **no browser/camera session, face-identity
accuracy evaluation, distinct-speaker accuracy test or 500-student load test**.
Scores are model outputs, not transcription accuracy percentages. Six provider
reservations were charged to the shared production budget before the run;
unused reservations from the earlier timeout were conservatively retained.
The scratch database/container and temporary audio/credential copies were removed.

Frontend typecheck, lint and static/client builds passed (23 existing lint
warnings). `nginx -t` passed. Public HTTPS checks passed both from the VPS and
from outside Contabo using public DNS: account/exam status, auth-required API
reads, independent checkout refusal, public prerendered pages, private-page
`noindex` and unknown-route 404.

The existing conservative limits remain: ten active exam sittings globally,
five concurrent Free sittings, five lifetime Free participations, and two
minutes per entire exam. Shared Groq budgets remain 18 requests/minute,
1,800/day, 108 audio minutes/hour and 432/day. They cover all accounts and
retries, not each lecturer separately. No paid plan was activated. Accepted
jobs can wait for capacity; no immediate-results promise is made for a class
of 100–150 students on the Free provider allowance.

## Backup and remaining external work

Before opening, a private **81,735-byte** production database archive was
validated and restored into a fresh database on the independent load-test
PostgreSQL cluster. Restored user counts matched; the scratch restore database
was removed. No production fixture accounts were created and production user
counts were unchanged. The successful checkpoint is:
`/root/oraliq-exams-open-20261117-011207`.

Existing scheduled local backups remain. **Automated encrypted off-site copies,
independent host-down alerts and recovery-key custody are not configured yet.**
The owner has been told that external backup storage holds recoverable account,
exam/grade and biometric-template data (plus any queued audio), not exam videos.
No external storage account or credentials have been supplied. Do not describe
the backup requirement as complete or block normal exams on a paid speech plan.

Kashier Live activation, external backup storage and alert delivery, a human
Google sign-in/camera rehearsal, and representative class-size testing remain
separate launch work. Remove `payments-maintenance` only after live gateway
configuration and a verified payment/callback flow; do not remove it simply
because exams are available. Public SEO content is present, but indexing and
search ranking have not been verified.
