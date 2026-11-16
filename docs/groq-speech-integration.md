# Optional Groq speech integration

`SPEECH_PROVIDER=local` remains the default. Local Whisper is used unless an
operator explicitly selects Groq. There is no automatic provider or model fallback.
The integration is prepared for isolated validation before any public cutover.

## Selection and credentials

```dotenv
SPEECH_PROVIDER=groq
GROQ_SPEECH_MODEL=whisper-large-v3
GROQ_API_KEY_FILE=/run/secrets/groq
GROQ_REQUESTS_PER_MINUTE=18
GROQ_REQUESTS_PER_DAY=1800
GROQ_AUDIO_SECONDS_PER_HOUR=6480
GROQ_AUDIO_SECONDS_PER_DAY=25920
GROQ_TIMEOUT_SECONDS=60
```

Mount a private key file read-only into both API and grading-worker processes.
On Linux its permission bits must exclude group/other access. `GROQ_API_KEY` is
also accepted for deployments using their existing private environment file;
the file takes precedence when selected. Never put either secret in Git,
command arguments, screenshots or reports. Production refuses invalid provider
selection, missing/unreadable keys, unsupported models and invalid limits.
`whisper-large-v3-turbo` is the other supported explicit model choice.

Worker preparation validates Groq configuration without loading local Whisper or
sending a network request. Configured readiness is not a successful provider
connectivity/quota check. Dictation follows the same selected provider and budget.

## Evidence and grading

Audio-only decoding enforces the server-captured question bound (60/120 seconds
within the two-minute exam) before transfer; the transport also has a 600-second
defensive upper bound.
The provider receives a generated mono 16-kHz WAV with an anonymous `answer.wav`
filename. No student name, account ID, expected answer, voice template or camera
data is included. Graded recordings never use a prompt; dictation can retain
short bounded vocabulary context. Language remains automatic unless explicitly
set with `WHISPER_LANGUAGE`, preserving Arabic/English use.

Word timestamps are required for fluency grading. Missing, nonfinite, unordered
or out-of-bounds timestamps fail explicitly instead of generating an invented
fluency result. Existing fluency/content grading runs locally on the returned
evidence; the reference answer remains on the VPS. Voice verification keeps its
existing behavior and is not replaced by external transcription.

Only the fixed Groq transcription endpoint is used. Redirects/proxies are disabled,
responses are bounded, and the application does not perform hidden HTTP retries.
Provider error bodies/authorization headers are never included in errors.

## Durable account-wide admission and waiting

`speech_provider_controls` and `speech_provider_usage` contain provider metadata
only: no recordings, transcripts or keys. Normal schema initialization creates the
two additional tables. A database row lock serializes reservations across API and
worker processes. SQLite uses its writer lock; PostgreSQL uses the same row UPDATE.

Each outgoing attempt first reserves one request and conservatively rounded audio
seconds (minimum 10). Rolling minute/day request limits and hour/day audio limits
are checked together. Old events are pruned after 24 hours. Failed or ambiguous
requests retain their reservation; restarts do not reset it. These local counters
cover this application's attempts, not other tools using the provider organization.
They are not a provider account balance, an invoice or an instantaneous spend cap.

Defaults leave headroom under the published free-tier summary. Exact provider
account limits still govern. Local admission refusal sends no audio. HTTP 429
sets a shared cooldown respecting bounded `Retry-After`; 401/403 pause for an hour
to avoid repeated calls with invalid credentials. A corrected key may require the
cooldown to expire. No alternate model/key/account is used to bypass a limit.

HTTP 400 with the documented `blocked_api_access` code also defers grading for
15 minutes and sets the shared cooldown. This covers an organization spend cap:
accepted audio stays queued without spending failure attempts. Error parsing is
bounded to 4 KiB and never logs the provider body. Other HTTP 400 responses remain
ordinary errors so invalid requests are not hidden as budget waits. Provider
spend tracking is delayed; these waits do not create a real-time dollar cap.

The worker handles provider waits separately from ordinary grading failures:
the accepted job returns to `queued`, its recording remains, and the claim's
failure-attempt increment is returned. The old lease cannot overwrite another
worker's state. After the wait, grading resumes normally and successful audio is
purged when its grade commits. There is no promised completion time during a
provider outage or exhausted daily allowance. Other network/response errors keep
the existing bounded failure/retry and failed-audio-retention policy.

Synchronous teacher dictation returns 503 plus `Retry-After` when deferred, so the
teacher can type or retry later. It does not block a web request waiting for hours.

## Capacity and privacy boundaries

Pending admission remains 500 jobs and 2 GiB retained audio by default. A full
queue still rejects additional uploads; this integration does not grant unlimited
storage or promise 500 students can submit 1,000 answers at once. Groq's published
free daily audio allowance is below a 1,000-minute school scenario. Test and size
account quota, retention, exam admission and operational alerts together.

Enabling Groq transfers recordings to an external processor. Update the public
privacy/instructions and consent flow before a public switch. Groq describes
no default inference-content retention, with limited reliability/abuse exceptions
and organization controls. Local-only privacy language cannot be reused unchanged.

For validation, use an isolated `*_loadtest` database and private loopback API.
Do not connect test identities or synthetic biometric vectors to production.
An HTTP/queue workflow with a consenting owner's repeated audio proves that path,
not identity accuracy, diverse student Arabic, real browser recording or capacity.

References: [Groq speech API](https://console.groq.com/docs/speech-to-text),
[rate limits](https://console.groq.com/docs/rate-limits),
[data controls](https://console.groq.com/docs/your-data).

For the current private Contabo connection and public launch boundary, see
[the activation report](groq-activation-2026-11-16.md).
