# Small Groq speech probe

This is an optional external-service experiment, not a production integration or
500-student load test. Obtain the owner's authorization for the recording and
confirm the account is on the free plan before invoking it. Do not activate paid
billing as part of this probe.

The probe runs in the existing backend image with no application credentials or
database mounted. It reads a private temporary API-key file, uploads an anonymous
filename directly to `api.groq.com`, and requests Arabic transcription, temperature
zero, and word/segment timestamps. No model answer or prompt is sent. HTTP
redirects and environment proxies are disabled; responses are size bounded, each
request has a 90-second timeout, and errors do not log headers or provider bodies.

For the existing 34.539-second owner recording it makes at most six requests:
two original-clip repetitions for each of `whisper-large-v3-turbo` and
`whisper-large-v3`, followed by one composed 60-second input for each model.
The latter repeats/trims the original speech: it is not a distinct real-minute
answer. Total requested audio is about 258 seconds, below the probe's hard
300-second ceiling. Any non-200 result, including a quota/429 error, stops the run
without retries or alternate accounts.

Run on the VPS inside the existing backend image with private read-only input/key
mounts, a writable private report directory, `ENV=test` and `PYTHONPATH=/app`:

```sh
python /probe.py --key-file /run/secrets/groq \
  --audio /inputs/input.audio --output /reports/result.json \
  --confirm-free-account --send-owner-test-audio
```

The output must be a fresh filename. Keep it under ignored `loadtest-artifacts/`
with private filesystem permissions: it includes transcripts and word timestamps.
No audio files or credentials belong in Git or in the result archive. Remove the
temporary VPS key/audio mounts after the run and revoke a chat-shared temporary
key after the experiment.

Seven offline transport/privacy checks can be run without keys or network calls:

```sh
python -m unittest discover -s ops/loadtest/tests -p test_groq_speech_probe.py -v
```

An execution pass only establishes nonempty responses. Inspect the transcript,
word timestamps and Arabic terminology before considering a provider change.
Latency measures the transcription HTTP request; it excludes upload/admission to
OralIQ, voice identity, fluency/content grading, monitoring and lecturer review.
This code does not change the application's active model, queue or public site.

Groq documents no default inference-content retention, with limited exceptions for
reliability/abuse investigations and organization data controls. This differs from
keeping all audio on the owner's VPS. Follow the account's current data settings.

Official references: [speech endpoint](https://console.groq.com/docs/speech-to-text),
[limits](https://console.groq.com/docs/rate-limits),
[data controls](https://console.groq.com/docs/your-data).
