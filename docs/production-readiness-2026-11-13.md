# Production and privacy review — 2026-11-13

This records preparation and local validation, not a certificate that the application
has no vulnerabilities or a claim that the purchased VPS is deployed. Server IP,
domain, operating system and secure access have been requested but are not yet available
in this session. No production database or real student's biometric data was inspected.

## Implemented in this release

- Bilingual `/privacy-policy`, a homepage privacy section, footer link, exam instructions
  and enrollment notice distinguish camera checks, still frames, voice recordings,
  biometric templates, results and backups. No promise of a live lecturer video feed.
- Enrollment camera access waits for the user's affirmative checkbox. Revoking it stops
  that camera stream; opening a dialog does not start camera capture by itself.
- Exam recording uses a new stream containing **audio tracks only**. The API now inspects
  actual audio-container streams and rejects video before creating an answer or queue job,
  even if its filename and MIME type claim it is audio. Bounded AI decoding rejects video too.
- Raw frames are processed by face/gaze inference without writing a retained photo gallery.
  FastAPI may spool incoming multipart data to temporary files during a request; this is
  not a promise that media never touches transient storage. Reverse proxy/access logs must
  not capture request bodies, and temporary disks must not be backed up as student archives.
- Successful grading removes raw audio from the active queue. Failed jobs retain it for
  retry until their retention deadline (default 72 hours after final failure). Database
  backups may still contain earlier queue data; local backups default to 14 days. Off-site
  backup retention and deletion procedures must be confirmed on the real deployment.
- Error monitoring sends an allowlist of error metadata/categories. Request bodies, user
  identities, breadcrumbs, custom data, exception messages and stack locals are excluded;
  frontend replay, performance sampling and log/metric forwarding are disabled. Diagnostics
  consequently contain less detail; inspect private server logs when investigating failures.
- API face/gaze/voice inference shares a bounded capacity (default 2). Overload returns
  `503 BIOMETRIC_BUSY` with `Retry-After`, never a fabricated mismatch or successful match.
  Worker grading still has its separate two-job limit. These are CPU protections, not proof
  that 500 students can be served. The load driver will count overloaded checks as failures.
- Unsupported absolute anti-cheating promises and unmeasured 98% accuracy/90% saving figures
  were replaced with narrower descriptions. Existing testimonials are not rendered pending
  verifiable customer consent/evidence; their source component remains available for review.
  Prices and plan limits have not been changed, per the earlier request to revisit after
  server measurement. Published plan seat limits still need actual capacity validation.

## Release blockers and decisions

1. **Covered-face identity verification is not implemented.** Existing MediaPipe eye/iris
   landmarks are not an iris biometric. There is no eye-enrollment template, validated
   matcher, liveness guarantee or accuracy evaluation for a niqab workflow. Do not relabel
   face embeddings or lower face thresholds to claim support. The proposed alternative is
   voice matching plus lecturer-approved identity accommodation, pending the user's choice.
   No face-enrollment bypass has been enabled in the meantime.
2. **Face-model commercial authorization:** the current InsightFace `buffalo_sc` package is
   supplied for non-commercial research use. Before paid production, obtain the appropriate
   authorization or choose and evaluate a properly authorized replacement. The MIT license
   on library code does not change the supplied model weights' terms. No purchase or license
   acceptance has been made on the user's behalf.
3. **Actual Linux/VPS validation:** build the Python 3.12 Docker image, run dependency checks
   and container scanning, preload authorized models and run real Arabic audio/identity smoke
   tests before traffic. Local Windows dependency resolution/unit tests do not establish this.
4. **Migration and secure cutover:** confirm the source database type, pause writes during
   migration, preserve user IDs/templates/payment records and signing-key strategy, verify
   restored counts and resume only one authoritative database. Do not switch Vercel's API
   URL until the new API, HTTPS and in-progress-exam migration plan are verified.
5. **Operational proof:** confirm DNS, certificates, key-based SSH/firewall, no public PostgreSQL
   or API port, private logs, worker recovery, tested encrypted off-site backups/restore,
   monitoring for queue age/disk/errors, SMTP, Google origins and Kashier live webhooks.
6. **Capacity and model evaluation:** start with a small consenting pilot, then execute the
   isolated 500-student / two 180-second questions scenario, including school-NAT login limits,
   real face inference, upload errors and queue drain. Set a grading SLA after measurement.

## Validation record

- Frontend audit (2026-11-13): zero known advisory findings in the current lockfile.
- Python audit (2026-11-13): zero known findings for the 119 resolved pinned versions;
  not an audit of the Linux image or OS packages and not a proof of absence of vulnerabilities.
- Frontend typecheck, lint and final production build passed; 15 Node tests passed. Existing
  lint warnings remain (25 in the full lint run; two `any` warnings in the changed enrollment
  component). No claim is made that all lint warnings or all UI flows are covered.
- Full backend suite passed: **364 passed, 1 skipped** (PostgreSQL concurrent admission test
  requires `TEST_POSTGRES_URL`). This run began before the final media/capacity additions;
  those changes were verified separately rather than claiming a new full-suite run.
- Focused identity/security/privacy/capacity run: **17 passed**. Final cancellation/metadata
  tests: **5 passed**, including raw asyncio cancellation retaining CPU capacity until the
  actual inference thread finishes. Audio-container/queue regression run: **27 passed**,
  including a real encoded video upload rejected with no submission/job persisted.
- Real Linux build, real model inference, 500-student server load, DNS/HTTPS and backup restore:
  **not performed** in this session; need the purchased server details and secure access.
- Prepared CI template is still `ops/ci/security.yml`; the previous credential lacked workflow
  permission. Do not report it as an active or successful GitHub Actions workflow.

## Server handoff

Provide only the server's public IP, intended frontend/API domains and OS here. Do not paste
passwords, private keys or production `.env` values into chat. Arrange existing SSH key access
or enter credentials locally when needed. Confirm whether the current database contains real
users/exams that need preserving before any migration. No server data should be deleted to
"start fresh" without an explicit decision about those records.

Use [Contabo deployment](../deploy/contabo/README.md),
[real-model and school load tests](../ops/loadtest/README.md), and
[encrypted off-site backups](../ops/backup/README.md).

Primary references:
[MediaPipe Iris limitations](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/iris.md),
[InsightFace model terms](https://github.com/deepinsight/insightface/blob/master/python-package/docs/model_zoo.md).
