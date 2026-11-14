# Production and privacy review — 2026-11-13

This records preparation and validation, not a certificate that the application has no
vulnerabilities or that production cutover is complete. On November 14, the purchased VPS
was inspected through an authenticated SSH session: Ubuntu 24.04.5 LTS, 8 CPUs, 23.5 GiB
RAM and about 290 GiB disk. An isolated staging API/PostgreSQL deployment now runs there.
The user supplied `oralliq.com`; API DNS/HTTPS are now verified. The public frontend
cutover and application-level production checks remain pending.
No production database or real student's biometric data was inspected.

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

1. **Covered-face accommodation now has a release candidate**, after the user approved
   voice verification plus lecturer identity approval per exam. See [the workflow and
   limitations](covered-face-mode.md). Eye-region visibility is experimental, not iris
   matching, gaze direction or liveness. It requires real consenting niqab/device testing
   before actual classes; neither eye failure nor overload creates a cheating penalty.
2. **Face-model commercial authorization:** the current InsightFace `buffalo_sc` package is
   supplied for non-commercial research use. Before paid production, obtain the appropriate
   authorization or choose and evaluate a properly authorized replacement. The MIT license
   on library code does not change the supplied model weights' terms. No purchase or license
   acceptance has been made on the user's behalf.
3. **Actual Linux/VPS validation:** the Python 3.12 CPU Docker image builds, `pip check`
   passes and staging API/PostgreSQL health checks pass. Linux tests found a PyAV 19
   incompatibility that broke audio inspection/decoding; it was fixed by removing the
   deleted `metadata_errors` argument, then 56 focused tests passed, including actual
   PostgreSQL concurrent queue admission. Container/OS advisory scanning, authorized model
   preloading and real Arabic audio/identity smoke tests remain required before traffic.
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
- Frontend typecheck, lint and final production build passed; 16 Node tests passed. Existing
  lint warnings remain (25 in the full lint run; two `any` warnings in the changed enrollment
  component). No claim is made that all lint warnings or all UI flows are covered.
- Full backend suite passed: **364 passed, 1 skipped** (PostgreSQL concurrent admission test
  requires `TEST_POSTGRES_URL`). This run began before the final media/capacity additions;
  those changes were verified separately rather than claiming a new full-suite run.
- Focused identity/security/privacy/capacity run: **17 passed**. Final cancellation/metadata
  tests: **5 passed**, including raw asyncio cancellation retaining CPU capacity until the
  actual inference thread finishes. Audio-container/queue regression run: **27 passed**,
  including a real encoded video upload rejected with no submission/job persisted.
- Linux validation (November 14): Docker build, dependency consistency check, CPU Torch
  (`2.15.0+cpu`, no CUDA), OpenCV, PyAV, Transformers, Resemblyzer, SentenceTransformer and
  InsightFace library imports passed. Container runs as UID 10001. These import checks do
  not establish model inference accuracy or authorization to use face weights commercially.
- Full Linux/Python 3.12 backend run after the PyAV fix: **376 passed, no skipped tests**
  in 347 seconds, including the real PostgreSQL admission test in a disposable schema.
  The suite uses mocked AI inference; 2,690 deprecation warnings were reported. This
  supersedes the earlier Windows-only full-suite result for the current backend code.
- Isolated API and PostgreSQL are healthy. API binds only `127.0.0.1:18000`; PostgreSQL
  has no published host port. `/docs`, `/redoc`, `/openapi.json`, `/debug` and `/health/keys`
  return 404; unauthenticated accommodation requests return 401. Automatic face/gaze
  preloading is disabled in staging; Whisper/SBERT worker inference is not running yet.
- Actual Linux runtime Python advisory audit: no known findings among checked packages;
  `torch==2.15.0+cpu` was skipped because that build is not listed on PyPI. This is not
  an audit of OS packages, model files, all application logic or the skipped CPU wheel.
- UFW was enabled after explicit approval: incoming SSH 22 is limited, web 80/443 allowed,
  other incoming connections denied, outgoing allowed, with IPv4/IPv6 rules verified.
  The current SSH session still works. No persistent root SSH key was installed.
- The production existing-Nginx override passes Compose validation: Caddy is excluded,
  PostgreSQL is private and API binds only loopback port 18001. The prepared Nginx virtual
  host passes `nginx -t` using a temporary self-signed certificate in a separate test
  configuration. It is not enabled, and no public TLS certificate has been issued.
- Staging CORS preflight accepts the configured Vercel origin and rejects an unrelated
  origin without an allow-origin header. The OS reports a required restart; it has not
  been rebooted during the current administrative session.
- A staging `pg_dump`/`pg_restore --exit-on-error` completed into a separate restore-check
  database: both contain 16 public tables and zero users. This proves an empty-schema
  backup round trip only; it is not a restore test of real student data or off-site backups.
- Real Arabic speech/identity model inference, 500-student server load, public DNS/HTTPS,
  production-data migration and encrypted off-site backup restore remain **not performed**.
  Update after the owner's DNS change: API DNS, public HTTPS, HTTP redirect and simulated
  certificate renewal now pass. The API serves an intentional maintenance response;
  it does not yet serve the public application. The owner confirmed existing site data
  are experiments only; no old records have been deleted. A private production candidate
  with a separate DB/worker/local-backup stack has started; live payments and SMTP are pending.
- Prepared CI template is still `ops/ci/security.yml`; the previous credential lacked workflow
  permission. Do not report it as an active or successful GitHub Actions workflow.

## Server handoff

Provide only the server's public IP, intended frontend/API domains and OS here. Do not paste
passwords, private keys or production `.env` values into chat. Arrange existing SSH key access
or enter credentials locally when needed. Confirm whether the current database contains real
users/exams that need preserving before any migration. No server data should be deleted to
"start fresh" without an explicit decision about those records.

Use [Contabo deployment](../deploy/contabo/README.md),
[the concrete oralliq.com cutover plan](../deploy/contabo/oralliq-cutover.md),
[real-model and school load tests](../ops/loadtest/README.md), and
[encrypted off-site backups](../ops/backup/README.md).

Primary references:
[MediaPipe Iris limitations](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/iris.md),
[InsightFace model terms](https://github.com/deepinsight/insightface/blob/master/python-package/docs/model_zoo.md).
