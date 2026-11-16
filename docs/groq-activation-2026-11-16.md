# Groq connection on Contabo — November 16, 2026

The owner supplied a fresh key in the private local file and confirmed the Groq
account is **Free**. The private API/worker/mailer now select Groq
`whisper-large-v3`. No paid plan, card, credits or billing setting was activated.
Public account/exam requests remain maintenance 503; the frontend is live.

## Verified connection and deployment

- A models-metadata request authenticated successfully (HTTP 200).
- One real, previously authorized owner recording, **34.539 seconds**, completed
  Groq transcription and local fluency/semantic grading. The pipeline took
  **24.655 seconds including cold local NLP initialization**, returned 65 words
  and did not load local Whisper. This is not an ASR-only latency measurement,
  a transcription-accuracy percentage, a biometric test or a capacity result.
- The probe created no student accounts, exam sittings or results. Its real and
  ambiguous provider reservations remain in the durable counters; they were not
  refunded. Temporary VPS audio/key copies were removed. The production key
  remains in the root-private deployment environment, excluded from source and
  reports; the owner's original recording and private local key are preserved.
- A **20-table pre-activation PostgreSQL dump** was verified. The deployment
  preserved database rows and tested no active sittings or queued grading jobs
  before changing configuration. Private API health is 200.
- CORS accepts `https://oralliq.com` and `https://www.oralliq.com` and rejects an
  unrelated origin. `FRONTEND_URL` now points to `https://oralliq.com` for account
  mail links. This does not prove actual signup/reset mail delivery.
- Frontend release `/srv/oraliq-web/releases/groq-20261116` is live over HTTPS.
  Privacy, homepage and exam notices name Groq and describe what is transmitted.
  The pre-exam checkbox explicitly covers external audio transcription. Served
  privacy/consent bundles were checked and 27 changed files matched SHA-256.
  Homepage/privacy returned 200, API maintenance 503 and a missing asset 404.
- Frontend typecheck, lint and build passed; lint still reports 23 warnings.

## Spend-cap handling verified and deployed

The candidate now runs `oraliq-backend:groq-budget-20261116`. Groq's documented
HTTP 400 / `blocked_api_access` response enters a shared 900-second provider
wait. The worker keeps accepted audio queued and restores the claim's failure
attempt; processing can resume when provider access returns. Unrelated invalid
HTTP 400 requests still fail normally. Bodies are read only up to 4 KiB and are
never logged. This does not buy credits, lift a provider cap or promise a result
time while the cap remains exhausted.

**63 focused Linux/Python 3.12 tests passed, zero failures/errors/skips**: transport,
bounded/redacted spend errors, actual durable worker wait/resume and audio purge,
transcription settings, plus a real isolated PostgreSQL concurrency/cooldown case.
The first focused attempt used a stale test-only biometric helper inherited from
the base runtime; the validated run uses the repository's current SFace helper.
Production enrollment validation was not relaxed. An initial runner lacked pytest;
the final runner installs it only in the disposable test container.

After rollout, API health is 200 and SFace loads successfully; API/worker/mailer
are running the new image. The earlier full baseline suite was 497 tests at
`3a3673c`; it was not repeated for this narrow follow-up. No further external
audio request was needed for the mocked spend-cap cases. Source overlay SHA256:
`4d282196ee455937b24a76bfdb711d2c8d26b72a93de80a18a50240dccef6d5d`.

## Limits and billing decision

The shared application ceilings remain **18 requests/minute**, **1,800/day**,
**6,480 audio seconds/hour** and **25,920/day**, leaving headroom under the
published free summary. Account-wide limits also cover other tools/keys in the
same Groq organization; the provider's exact account limits still govern.
These local counters are not a dollar balance or monthly spend limit. Upgrading
the provider account will not silently increase the application's ceilings.

For launch planning, **USD 10** is an initial speech budget, separate from the
owner's USD 20 VPS cost. At the verified Large V3 rate of USD 0.111/audio-hour,
USD 10 buys about 5,405 audio minutes or 2,702 full two-minute exams, before
retries, taxes and other usage. A 25% cost buffer reduces that planning capacity
to about 2,162 exams. The margin calculator already budgets paid audio rather
than assuming free quota.

Developer is billed by usage; this is not a requirement to buy a USD 10 monthly
subscription or prepay that balance. Once the owner upgrades, configure the
organization's monthly spend limit and email alerts. Groq documents a 10–15
minute spend-tracking delay, so its cap can be exceeded during that interval.
No monthly currency cap or billing alerts have been configured by this rollout.

## Privacy and remaining launch boundary

Only anonymous-named answer audio goes to Groq; account fields, camera frames,
reference answers and biometric templates are not attached. Speech can itself
contain information the student says. Semantic grading and voice matching stay
on Contabo. Groq documents default non-retention of inference content with
reliability/abuse exceptions; **Zero Data Retention has not been verified as
enabled on this organization**. The public policy links to the provider's
retention/location details instead of promising that all audio stays local.

The public exam API is still closed. External backup/restore and alert delivery,
final account-flow/mail checks, provider quota for launch and Kashier Live
activation remain separate work. No real browser/camera or 500-student capacity
test was added here. Private reports are excluded from Git under
`loadtest-artifacts/groq-activation-20261116/`.

Sources: [Groq speech pricing/API](https://console.groq.com/docs/speech-to-text),
[account limits](https://console.groq.com/docs/rate-limits),
[billing](https://console.groq.com/docs/billing-faqs),
[spend limits and tracking delay](https://console.groq.com/docs/spend-limits),
[data handling](https://console.groq.com/docs/your-data).
