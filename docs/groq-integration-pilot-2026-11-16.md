# Groq integration pilot — November 16, 2026

The optional provider integration completed a real isolated HTTP/queue/grading
workflow. Production remains on local Whisper medium; public routing was unchanged.

## Code and verification

- Groq is explicitly selected with `SPEECH_PROVIDER=groq`; local remains default.
  Existing fluency/content grading consumes external transcript/word evidence.
- Shared durable request/audio reservations and provider cooldowns survive process
  state loss. A provider wait keeps accepted audio queued without consuming the
  grading failure budget. Ordinary failures retain their existing bounded retries.
- Local focused tests: **56 passed** (mock HTTP and file SQLite). The later
  PostgreSQL-specific test was included in the full Linux run below.
- Full Linux/Python 3.12 backend suite: **455 passed, 0 failed, 0 skipped**,
  307.17 seconds. Real concurrent PostgreSQL budget reservation was tested in a
  disposable schema of the isolated `*_loadtest` database and cleaned up.
- Dedicated image `oraliq-backend:groq-pilot-20261116` used the existing `fc8ba0e`
  CPU dependency image plus the current backend source; no dependency changes.
  Source archive SHA256:
  `f9d855d99eaf5ae1a10868afdaf0577d8b51a0ec17a17f6cd8cd5c523f9dc29b`.

## Actual exam workflow

Three synthetic student accounts and one fixture lecturer used real password
logins and a private loopback HTTP API. Each student submitted two answers using
the same authorized owner-supplied 34.539-second clip. This is one real speaker,
not three consenting students or six independent real answers.

The following passed:

1. Opening time blocks early exam access, and reference answers stay hidden.
2. Six unique answers are accepted; repeated uploads return the same submission.
3. Another student cannot read an answer's grading status.
4. An **injected local cooldown** queues a claimed answer without sending audio,
   losing the recording or spending a grading failure attempt. The probe removes
   only that injected wait to continue promptly; it did not bypass a real 429.
5. The six jobs run real Groq `whisper-large-v3` transcription plus existing local
   fluency and SBERT content grading. Each actual job succeeds in one attempt.
6. Manual results remain hidden until the fixture lecturer publishes them; each
   student then receives only their own two grades.
7. Completed recording bytes are purged and six durable provider reservations
   are present. Local Whisper was never loaded in the pilot process.

| Measurement | Observed |
| --- | ---: |
| Six-job grading batch, two concurrent workers | 12.509 s |
| Individual job processing | 1.743–7.099 s |
| Prior local SBERT preload, excluded from batch | 17.443 s |
| Whole scripted HTTP workflow | 38.458 s |

The model outputs were content 93.0, fluency 95.0 and final grade 93.2 for all six
copies. These are model grades, **not transcription accuracy percentages or
teacher calibration**. Timing comes from one small run; it is not a grading SLA
or an extrapolation validated on 500 students.

Identity enrollment used synthetic vectors solely for test admission. Voice
matching was deliberately excluded from the queued fixture jobs rather than
pretending those vectors identify this real speaker. Real biometric enrollment,
camera/eye checks and real browser/microphone behavior were not tested here.

## Cleanup and deployment boundary

The pilot API container was removed, its loopback port released, temporary VPS
audio/key copies and environment files removed, and the local temporary key file
cleared. The owner must revoke a chat-shared temporary key in the provider console.
The original owner Downloads file is preserved. No billing/payment setting changed.

The current candidate API returned HTTP 200 after the experiment. No production
provider, queue limit, frontend build, public routing, payment or plan price was
changed. The pilot image/source remain available for review; they do not select
Groq on the public site. Detailed transcripts, scores and JUnit results are
restricted local artifacts under `loadtest-artifacts/groq-integration-20261116/`.

Before a public provider change, validate diverse consented Arabic/English answers,
browser behavior, account quota and external-processing privacy text. Existing
500-job/2-GiB admission ceilings and the free provider's lower daily audio quota
still apply. See [configuration and failure behavior](groq-speech-integration.md).
