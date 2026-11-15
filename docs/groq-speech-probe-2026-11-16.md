# Groq speech probe — November 16, 2026

The requested small external-service experiment completed six real transcription
requests successfully. It supports evaluating Groq as an optional speech provider;
it is not a production switch, quality certification or 500-student capacity test.

## Method and measured results

- Source: the owner's authorized 34.539-second Arabic audio-only recording. No
  student data, enrolled biometrics, video or expected-answer prompt was sent.
- Four requests transcribed the original (twice per model). Two more transcribed
  a 60-second input made by repeating/trimming that same clip. One speaker only.
- Requests ran sequentially from the VPS in an isolated `oraliq-backend:fc8ba0e`
  container, with a 2-CPU/4-GiB local ceiling, anonymous upload filenames, Arabic
  language, temperature zero and word/segment timestamps. The provider does the
  model inference externally; the local resource ceiling is not its compute limit.
- Total submitted duration: approximately 258.155 seconds, below the probe's
  300-second cap. There were no automatic retries, account switching, errors or 429s.

| Model | Original clip, request 1 | Original clip, request 2 | Composed 60-second clip |
| --- | ---: | ---: | ---: |
| `whisper-large-v3-turbo` | 0.424 s | 0.460 s | 0.508 s |
| `whisper-large-v3` | 0.727 s | 0.928 s | 1.221 s |

All six HTTP responses were 200 and supplied nonempty transcripts and valid
bounded word timestamps. Original transcripts were identical on repetition within
each model (65 words); constructed-minute transcripts had 116 words.

Inspection found both original outputs corrected several visible errors from the
earlier local medium/small samples, but both still distorted the last phrase.
Turbo had an additional distortion in that phrase. These are observations on one
short reading, not a measured Arabic word-error rate or accuracy percentage.

The latency above is the complete transcription HTTP request from the VPS. It
excludes OralIQ submission/upload, queue delay, fluency/content grading, voice
identity, camera monitoring and lecturer review. It must not be compared directly
with earlier full local ASR/NLP pipeline timings as an end-to-end speedup claim.
No concurrent school cohort or broader speaker/subject sample was tested.

## Privacy, billing and cleanup

The owner explicitly requested the free-tier experiment and supplied a temporary
key. No billing/payment settings were changed and no invoice/billing-tier read
was performed. Actual account quota and spend must be checked in its console.

Groq documents no default inference-content retention, with limited exceptions for
reliability/abuse investigations and organization data controls. Uploading to Groq
is external processing; production privacy text must reflect that before a switch.

The temporary container and VPS input/key copies were removed. The local temporary
key file was cleared after saving the reports; account-level revocation of a
chat-shared key remains the owner's action. Source recordings in the owner's
Downloads folder were preserved. Detailed private transcripts/timestamps and
numeric results are under ignored `loadtest-artifacts/groq-20261116/` with
owner-only Windows permissions. No key or raw audio was placed in Git.

Production remains on the existing local medium model. Queue limits, public
routing, billing packages and frontend deployment were not changed.

Seven offline request/privacy checks passed: anonymous multipart upload, no
reference prompt, bounded response, 429 stop without retry or error-body leakage,
timestamp rejection, no key in reports and no authorization-forwarding redirects.
See the [repeatable probe instructions](../ops/loadtest/GROQ_SPEECH_PROBE.md).

Official references: [speech API](https://console.groq.com/docs/speech-to-text),
[rate limits](https://console.groq.com/docs/rate-limits),
[data controls](https://console.groq.com/docs/your-data).
