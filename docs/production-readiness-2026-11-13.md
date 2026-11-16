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
   PostgreSQL concurrent queue admission. Whisper, SBERT and voice models now load in the
   private candidate worker. Container/OS advisory scanning and real Arabic audio/identity
   smoke tests remain required before traffic.
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
- After explicit owner approval on November 14, `oraliq-ops` was created with an
  Ed25519 authorized key and password-required sudo. Fresh key-only login and an actual
  sudo command passed both before and after SSH hardening; passwordless sudo was rejected.
  Effective SSH settings are `PermitRootLogin no`, `PasswordAuthentication no`,
  `KbdInteractiveAuthentication no`, `PubkeyAuthentication yes`; configuration validation
  and service reload passed. Existing keys/accounts were preserved. A root-private copy
  of the previous SSH configuration is retained for console recovery. The temporary
  uploaded sudo password was removed; the private key and generated sudo password remain
  in owner-only files outside this checkout. Post-change API health was 200 and mailer healthy.
- The production existing-Nginx override passes Compose validation: Caddy is excluded,
  PostgreSQL is private and API binds only loopback port 18001. The prepared Nginx virtual
  host passes `nginx -t` using a temporary self-signed certificate in a separate test
  configuration. It is not enabled, and no public TLS certificate has been issued.
- Staging CORS preflight accepts the configured Vercel origin and rejects an unrelated
  origin without an allow-origin header. The required OS restart was then completed:
  kernel is now `6.8.0-149-generic`. Docker, Nginx and the certificate timer restarted
  automatically; candidate API/DB are healthy, worker/backup are running, private API
  health is 200 and public TLS maintenance is 503. This is an empty-queue restart check,
  not proof of recovery during an active recorded exam or in-flight grading job.
- A staging `pg_dump`/`pg_restore --exit-on-error` completed into a separate restore-check
  database: both contain 16 public tables and zero users. This proves an empty-schema
  backup round trip only; it is not a restore test of real student data or off-site backups.
- API DNS, public HTTPS, HTTP redirect and simulated certificate renewal now pass. The
  public API hostname serves an intentional maintenance response. A private production
  candidate with a separate DB/worker/local-backup stack has started. The owner confirmed
  existing site data are experiments only; no old records have been deleted. Kashier Live
  activation remains pending. SMTP account/domain verification and TLS authentication
  inside the API now pass; one owner-approved test message was accepted by SMTP
  and confirmed received in Inbox. End-to-end signup and recipient authentication
  headers still need their own checks.
- Candidate worker loading passed: Whisper medium CPU int8, SBERT and Resemblyzer, about
  1.85 GiB worker RSS after startup. This is idle model-loading memory, **not peak grading
  memory, an Arabic inference-quality result or a 500-student capacity measurement**.
- First-boot backup validation exposed a race: the backup started after PostgreSQL became
  healthy but before API schema setup, yielding a readable zero-table archive. Backup now
  waits for API health and requires at least 16 tables before publication/pruning. The old
  empty archive was quarantined. A real empty-DB test exits 1 and publishes no `.dump`;
  the new 16-table production-candidate dump restores successfully into a separate DB.
- Real Arabic speech/identity model inference, 500-student load, frontend cutover and
  encrypted off-site backup restore remain **not performed**. The current backup services
  provide local copies; off-site storage and alert delivery still need configuration.
- Email quota follow-up: registration/resend API and UI now acknowledge the request rather
  than claiming delivery. Focused authentication/email-ownership tests: **30 passed**;
  frontend typecheck passed. This copy change was checked after the 376-test Linux run.
  The subsequent release candidate adds an encrypted durable outbox, bounded retries,
  token-expiry checks, global sending leases/budgets and admin-only dashboard warnings.
  Local queue tests: **23 passed**; combined auth/queue/config check: **69 passed** before
  the final two queue tests. Frontend typecheck, targeted lint and production build pass.
  Linux validation: **398 cases passed** in the full run; four PostgreSQL cases initially
  could not connect because the isolated staging DB had stopped after the earlier reboot.
  After starting that test DB, **all four PostgreSQL cases passed**, including queue admission,
  cross-worker delivery leases and simultaneous per-account resend throttling: 402 passing
  cases across the full run and targeted infrastructure rerun. No test mail reached SMTP.
  Candidate image `a7f3dd8` is deployed privately. The API and independent mailer are healthy;
  queued mode, zero pending/reserved test messages, fresh heartbeat, a 1,000-entry cap and
  90/day local pilot budget were verified. Admin monitoring rejects anonymous requests (401).
  A 16-table pre-release backup was verified before the additive outbox/state schema update.
  The admin dashboard UI is built on the release branch, not on the current public site.
  Adequate provider quota, full real signup delivery and independent external alerts remain open.
- Prepared CI template is still `ops/ci/security.yml`; the previous credential lacked workflow
  permission. Do not report it as an active or successful GitHub Actions workflow.
- November 14 operational follow-up: a real SIGKILL/replacement-process PostgreSQL smoke
  passed all 15 checks, including preserved queued audio, two persisted/released results,
  rejection of a stale holder's write and schema cleanup. AI computation was simulated;
  test leases were shortened only in the test processes, not the running services.
  This does not prove an in-flight browser recording or real model inference.
- Linux worker audio now uses anonymous temporary files so an interrupted inference leaves
  no named recording behind after process death. Actual PyAV decoding of that descriptor
  and its removal after SIGKILL passed. Windows has normal-exit named-file cleanup only.
  Focused queue/load-tool regression run: **41 passed**; no local ML weights were loaded.
- Actual isolated school-NAT login probe: 500 logins offered over 60 seconds from one IP,
  **20 HTTP 200 / 480 HTTP 429**, no transport errors, no exams started. Existing IP-based
  authentication throttling remains enabled. School login/admission design still blocks
  promising 500 students from one network. The fixture-only reserved-domain validation bug
  found at preflight was fixed without changing application email validation.
- Owner-supplied Arabic audio probe (November 14): a 34.539-second AAC recording, inside
  a file named `.ogg`, passed actual container/stream inspection and anonymous-file decoding.
  An offline, separate container used the candidate's cached medium model, CPU
  `int8_float32`, two inference workers/two threads and a five-CPU ceiling. No enrollment,
  database exam, browser/upload, face or voice-match test was performed.
  Baseline repeated transcriptions were unstable (content scores 18.7–99.7), despite
  identical input audio. Supplying the expected answer as an ASR prompt was removed from
  grading, filler-word priming removed, and decoding temperature fixed at 0. Dictation
  retains bounded optional vocabulary context. The reference answer is used only by NLP.
  In the controlled comparison all four transcripts/content scores were identical:
  content 97.9/100, fluency 95/100 (model scores, not measured accuracy or lecturer validation).
  Warm single pipeline: 52.266 seconds; two concurrent copies: 58.760 seconds total;
  process peak RSS 2,846.2 MiB. The first controlled pipeline was 59.814 seconds but
  **excluded prior Whisper initialization**, so it is not a complete cold-start measure.
  This single short reading cannot establish three-minute or 500-student capacity.
  Raw server upload copies were removed after each probe. Detailed transcripts remain
  in private reports outside Git; no real email or third-party inference API was used.
  Relevant decoding behavior is documented in the
  [faster-whisper implementation](https://github.com/SYSTRAN/faster-whisper/blob/master/faster_whisper/transcribe.py).
  Transcription-settings and queue regressions: **29 passed**, using stubbed models;
  no weights were loaded on the owner's Windows machine.
  Release image `5e25455` then reproduced the controlled transcript and content score
  using unmodified application defaults, with a full fresh-process pipeline of 70.687
  seconds including initialization. Its isolated recovery smoke passed 15 checks;
  the 18-table pre-release dump was verified and the private candidate rollout completed.
  Private API health is 200; public HTTPS remains maintenance 503. Mail metrics are
  healthy with zero messages sent/reserved. The final raw upload was removed and private
  reports were copied to the owner's D drive. No full browser-exam or 500-student claim.
- November 15 school-login follow-up: private image `fc8ba0e` replaces the password
  login's shared 20/IP attempt cap with per-account throttling, a retained 20-wrong-password
  IP budget, a total IP ceiling and bounded actual hashing/queue admission. The real
  isolated HTTP probe admitted **500/500** valid accounts over the 60-second ramp;
  all subsequent identity reads passed, with no transport errors. Abuse/forged-header
  checks passed after explicitly disabling proxy-header trust in the probe container.
  Full Linux/PostgreSQL suite: **427 passed, no skipped tests** after correcting a
  test-only mock timeout and rerunning the suite. Synthetic ten-student/two-question
  HTTP workflow passed fourteen checks, including twenty idempotent queued answers,
  covered-mode review, schedule boundaries and manual publication. No real enrollment,
  AI inference or browser recording is represented by that workflow smoke.
  Candidate rollout and health passed; SMTP counters remain empty; public TLS is still
  maintenance. Computer Use ended because Chrome's current URL could not be determined
  confidently for policy enforcement; the browser flow still requires verification.
  [Detailed controls, measurements and limitations](password-login-admission.md).
- November 15 capacity assessment completed: eight real ASR/NLP jobs on composed
  one-minute Arabic speech measured 1.1762 answers/minute at the current 2×2 setup
  and 1.5467 at an isolated 4×1 comparison, under the existing 5-CPU grading ceiling.
  Four jobs took 204.052/155.171 seconds respectively; peak process RSS was about
  2.94/4.17 GiB. A hypothetical 1,000-answer drain is about 14/11 hours at those
  rates; it was not an actual 1,000-job inference run and excludes biometric/camera load.
  Separate real HTTP/PostgreSQL admission with ten in-flight uploads accepted only
  500/1000 answers at the existing pending cap, and 1000/1000 at an isolated 1200 cap.
  Upload audio/identities were synthetic; cleanup and no orphan answers were verified.
  Production limits/routing were preserved. Do not call the current setup ready for
  500 students with fast results. See [full methodology and estimates](server-capacity-2026-11-15.md).

- November 15 smaller-model follow-up: eight real offline minute-long ASR/NLP
  jobs plus one original-recording pipeline tested Whisper small under the same
  5-CPU/14-GiB ceiling. Four-job batches took 68.531 seconds (2 jobs / 2 threads)
  and 57.660 seconds (4 jobs / 1 thread), approximately 3.0x / 2.7x the earlier
  medium throughput. Inspected Arabic output had additional word distortions;
  no model switch or paid service was activated. Successful executions do not
  establish acceptable exam accuracy, and the faster sample still extrapolates
  to about four hours for 1,000 answers. Uploaded raw audio was removed, inference
  containers were removed, and private API health returned 200. Production model,
  limits and public routing were preserved. See the
  [comparison and decision](local-speech-comparison-2026-11-15.md).

- November 16 owner-authorized Groq experiment: all six external transcription
  requests returned HTTP 200 with nonempty text and usable word timestamps.
  The 34.539-second source took 0.424–0.460 seconds on Turbo and 0.727–0.928
  seconds on Large; a composed one-minute input took 0.508/1.221 seconds. The
  original transcript repeated identically per model. Visible word errors remain;
  no accuracy certification, full grading latency or school-concurrency claim.
  No billing was activated and no production provider/configuration was changed.
  Temporary source/key copies and the container were removed. Account revocation
  of the owner-shared temporary key remains an owner action. Detailed methodology:
  [Groq speech probe](groq-speech-probe-2026-11-16.md).

- November 16 optional Groq integration: local speech remains default; Groq gains
  bounded external transcription, strict word evidence and database-backed shared
  quota/cooldown admission. Provider waits preserve accepted recordings and do not
  spend the failure budget. Full Linux suite **455 passed, no skipped tests**,
  including concurrent PostgreSQL reservation. An isolated real HTTP workflow with
  three fixture students/two answers each completed real Groq, fluency and SBERT
  grading: six-job batch 12.509 seconds after 17.443 seconds SBERT preload; whole
  script 38.458 seconds. Manual publication, result authorization, idempotency,
  injected wait/resume and successful audio purge passed. One repeated real speaker;
  synthetic admission vectors; no biometric/browser/500-student capacity claim.
  Pilot container and temporary audio/key copies removed; candidate health 200.
  Production routing/provider/limits/pricing remain unchanged. See the
  [integration pilot](groq-integration-pilot-2026-11-16.md).

- November 16 Arabic scoring follow-up: semantic comparison now keeps negation,
  quantities and names rather than using the keyword layer's phonetic/stemming
  reductions as embedding input. Conservative orthography and one context-bound AI
  spelling alias preserve original stored transcripts. Local focused tests **19
  passed**; full Linux suite **469 passed, no skipped tests**. Six offline real
  cached-SBERT comparisons confirmed the typo handling and off-topic rejection,
  while exposing remaining entailment/quantity limitations (negated/changed-number
  diagnostics still over-score). Lecturer review/calibration remains necessary;
  these are similarity grades, not certified factual grading. Only the private
  owner-preview worker was upgraded; historical grades and production stay intact.
  See [details and measured limitations](arabic-scoring-normalization-2026-11-16.md).

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
