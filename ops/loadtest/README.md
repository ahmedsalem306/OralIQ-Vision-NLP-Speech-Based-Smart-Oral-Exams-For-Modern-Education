# School load test: 500 students, two 3-minute questions

This is a preparation kit, not a capacity result. No load has been sent to the live
site. The local selfcheck uses mocked HTTP responses: its 1,000 accepted/graded
answers prove the driver's accounting and retry behavior only. Real Linux builds,
model inference, PostgreSQL, resource use and exam capacity remain to be measured.
There is no agreed grading-time SLA; measure first, then set one.

## What is exercised

The default scenario starts 500 students over 60 seconds. Each records two answers
for 180 seconds, verifies a face roughly every 4 seconds, resumes/checks its session
every 30 seconds and submits within a 30-second jitter window. After recording, each
student polls one accepted answer every 3 seconds, rotating its answers. Stable
submission keys survive bounded retries and lost responses. Reports distinguish
received, graded, failed and pending answers, errors, queue observations and p95
HTTP latency (including client connection/slot wait).

That means **1,000 answers and 3,000 audio minutes**. The default queue admits up to
500 pending jobs and retains at most 2 GiB of audio, including failed-job audio.
With only two grading slots, the second wave may be rejected with 503. This is a
finding to measure, not a reason to silently remove the limits. Inspect throughput,
free disk, RAM and queue drain before changing limits or accepting a school booking.
The one-hour observation window is a test timeout, not a promise of turnaround.

These are HTTP clients, not 500 real browsers/cameras. Real browser recording,
upload recovery, mobile networks and camera/face quality need a separate pilot.
The fixture clones ONE consenting test identity to measure resource load, not
biometric accuracy with 500 different people. It bypasses registration, email,
payment and initial enrollment for the cohort. Generic fixture questions do not
prove grading quality; review separate real Arabic answers manually.

## Local driver check (no server, database or model downloads)

From `backend`, with the test requirements installed:

```sh
python -m pytest app/tests/test_school_load_tools.py -q
python -m scripts.load_test_selfcheck --report ../loadtest-artifacts/demo-school-500.json
```

The HTML report explicitly labels this as a mock. Do not quote its speed as server
throughput. All commands below are for an isolated staging server after purchase.

## Isolated Linux environment

Use a separate staging environment with no real student data and fresh secrets.
From `ops/loadtest`:

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD and SECRET_KEY in .env before continuing.
# Use a URL-safe random DB password (for example 32 random hex bytes).
docker compose config --quiet
docker compose up -d --build
docker compose exec api mkdir -p /data/inputs
mkdir -p ../../loadtest-artifacts
chmod 700 ../../loadtest-artifacts
```

The Compose project is `oraliq-loadtest`, with a separate `oraliq_loadtest` database,
model cache and artifact volumes. PostgreSQL is private. API binds only to
`127.0.0.1:18000`. CPU/RAM limits match the planned 8-vCPU/24-GB allocation:
API 2/4 GB, worker 5/14 GB, database 1/3 GB, leaving memory for the OS. Shared VPS
CPU performance must be measured. Model downloads stay in `/models`, not the
operator's home drive. No mail or payment credentials belong here.

Use a separate generator host for meaningful capacity measurements. Initially an
SSH tunnel can expose this loopback endpoint to the generator, but its results
include the tunnel and do not measure production TLS/CDN/network behavior. For
the final network run, configure a dedicated HTTPS `loadtest` or `staging` hostname,
change the config and regenerate the fixture with that exact origin. The driver
refuses ordinary production hostnames and mismatched fixture origins.

## Real model smoke test, before any cohort

Prepare consenting face photos (3–10 JPEG frames), two real Arabic speech clips
of about 180 seconds each, a separate voice-enrollment clip and a UTF-8 reference
answer. Use realistic compressed uploads, not generated silence. Keep the files
private and outside git. Copy the required smoke inputs, for example:

```sh
docker compose cp /private/inputs/q1.wav api:/data/inputs/q1.wav
docker compose cp /private/inputs/face1.jpg api:/data/inputs/face1.jpg
docker compose cp /private/inputs/answer.txt api:/data/inputs/answer.txt
docker compose stop worker
docker compose run --rm --no-deps worker python -m scripts.model_smoke \
  --audio /data/inputs/q1.wav --face-image /data/inputs/face1.jpg \
  --reference-text /data/inputs/answer.txt --cache-dir /models \
  --report /data/model-smoke.json --allow-model-download
docker compose cp api:/data/model-smoke.json ../../loadtest-artifacts/model-smoke.json
docker compose up -d worker
```

Only the first explicit preload needs `--allow-model-download`; omit it to check
cached/offline inference subsequently. Stop if any model check fails. This runs
Whisper, SBERT, Resemblyzer and InsightFace on actual inputs, with the worker's CPU
limits. It reports timings and booleans without transcripts or biometric vectors.
The Docker build also checks VAD/Resemblyzer imports; its narrow legacy VAD patch
changes only package version lookup to Python's `importlib.metadata`.
Neither these Linux commands nor the Docker image have been run on a VPS yet.

## Enroll one pilot, then prepare the cohort

From `ops/loadtest`:

```sh
docker compose exec api python -m scripts.load_test_prepare \
  --base-url http://127.0.0.1:18000 --students 1 --questions 2 --minutes 3 \
  --output /data/pilot.json --confirm-staging
docker compose cp api:/data/pilot.json ../../loadtest-artifacts/pilot.json
chmod 600 ../../loadtest-artifacts/pilot.json
```

From `backend` on the generator, with its Python dependencies installed:

```sh
python -m scripts.load_test_enroll --accounts ../loadtest-artifacts/pilot.json \
  --audio /private/inputs/enrollment.wav \
  --face-images /private/inputs/face1.jpg /private/inputs/face2.jpg /private/inputs/face3.jpg \
  --confirm-staging
```

Read the pilot student's email privately from `pilot.json`. From `ops/loadtest`,
replace `PILOT_EMAIL` below with that `@loadtest.invalid` email:

```sh
docker compose exec api python -m scripts.load_test_prepare \
  --base-url http://127.0.0.1:18000 --students 500 --questions 2 --minutes 3 \
  --identity-user-email PILOT_EMAIL --output /data/accounts-500.json --confirm-staging
docker compose cp api:/data/accounts-500.json ../../loadtest-artifacts/accounts-500.json
chmod 600 ../../loadtest-artifacts/accounts-500.json
```

The seeder refuses databases unless they are PostgreSQL, named with `_loadtest`
suffix, and explicitly enabled by `LOAD_TEST_ENABLED=1`. Without a genuinely
enrolled pilot it only creates an unenrolled scaffold, which full real runs refuse.
Credentials and bearer tokens are private; the manifest is gitignored. Do not post
it in a ticket or attach it to reports. Tokens expire after one day.

## Login probe and full exam run

Start resource capture on the server from `ops/loadtest` in another terminal:

```sh
bash capture_resources.sh oraliq-loadtest ../../loadtest-artifacts/resources.jsonl
```

First run a login-only probe from `backend` on the generator:

```sh
python -m scripts.school_load_test --config ../ops/loadtest/school-500.example.json \
  --accounts ../loadtest-artifacts/accounts-500.json --auth-only --login-mode password \
  --report ../loadtest-artifacts/auth-500.json --confirm-staging
```

The current login limit is 20 requests/IP/minute. A school behind one NAT, or one
generator IP, may get 429 responses. Keep this finding separate from exam capacity;
do not disable authentication protections just to make a benchmark pass. Decide the
school login/admission design from the measurements before rollout. This probe
does not consume an exam attempt.

Then test the exam using the cohort's already-issued tokens (default config):

```sh
python -m scripts.school_load_test --config ../ops/loadtest/school-500.example.json \
  --accounts ../loadtest-artifacts/accounts-500.json \
  --audio /private/inputs/q1.wav /private/inputs/q2.wav \
  --face-images /private/inputs/face1.jpg /private/inputs/face2.jpg /private/inputs/face3.jpg \
  --report ../loadtest-artifacts/school-500.json --confirm-staging
```

It checks the staging identities, idle queue, matching face and real clip duration
before starting. Progress is written every 10 seconds; final JSON and HTML contain
aggregate counts and errors, not credentials. A failed/pending grade is never
counted as completed. Successful retries still leave the initial rejection visible.
Each full run consumes attempts: use a fresh output filename/new fixture for reruns,
and let previous queued work drain before the next run. Do not mix concurrent runs.

Start with a small cohort: copy the config with `students: 10` and prepare a matching
fresh fixture before attempting 500. Capture generator resource use too: an overloaded
generator makes client-side latency misleading. Stop `capture_resources.sh` with
Ctrl+C after the queue drains and save staging API/worker logs privately.

## Decide readiness from the actual report

Check all 1,000 answers were received uniquely, how many completed/failed/remain,
503/429/transport failures, face mismatches, p95 latency, peak CPU/RAM, disk/audio
retention and queue drain. Determine grading turnaround from these observations;
`wait_seconds` may be increased to observe a slow queue, with no implied SLA.
Repeat after fixing bottlenecks, then validate a real browser pilot and backups/
restore before production cutover. Passing one synthetic run is insufficient to
promise 500 simultaneous real students. No prices are changed by this toolkit.
