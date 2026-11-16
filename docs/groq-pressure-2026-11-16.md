# Bounded Groq grading pressure — November 16, 2026

Two sequential cohorts of 10 and 20 preview accounts completed all 60 real
HTTP-submitted grading jobs successfully. This measures submission, durable queue,
Groq transcription and local grading under the current free-tier reservations.
It is not a real-student, camera/identity or 500-student test.

## Method

- Each account is a synthetic **lecturer previewing its own two-question exam**.
  This uses the existing lecturer-preview flow without inventing biometric
  enrollment or processing the speaker against a fake identity template.
- Audio per answer: 60 seconds composed by repeating/trimming the same authorized
  34.539-second owner clip. One speaker, no diverse actual one-minute answers.
- Ten uploads maximum in flight, two grading jobs in parallel, Large V3 on Groq, existing
  local SBERT/fluency grading, immediate results for these fixtures only.
- All real password logins and admission checks passed. The worker retained its
  real shared database-backed budgets: 18 requests/minute and conservative
  request/audio hour/day allowances. No allowance/cooldown was reset or bypassed.
- The second cohort followed the first; prior reservations still counted.
  The client's provider setting is local solely to avoid requiring an inference
  credential in a fixture/upload client. Grading ran in the actual Groq worker.

| Observed | 10 accounts / 20 answers | 20 accounts / 40 answers |
| --- | ---: | ---: |
| Accepted / unique / completed | 20 / 20 / 20 | 40 / 40 / 40 |
| Failed answers | 0 | 0 |
| Upload-wave wall time | 6.242 s | 6.626 s |
| Upload request p95 | 3.713 s | 1.860 s |
| All grades observed from first upload | 67.050 s | 132.777 s |
| Queue-wait p95 | 58.312 s | 122.222 s |
| Successful processing p95, excluding queue wait | 2.470 s | 2.359 s |
| Maximum final grading-attempt count | 1 | 1 |

Each account retrieved its own two finite grades. These are grading-model outputs,
not human-validated marks or speech accuracy measurements. Polling was every five
seconds, so result-observation time is an upper-bound sample rather than an exact
browser delivery latency. Recording time was simulated, not waited in a browser.

Progress snapshots showed queued answers waiting for provider admission while no
job was processing. During one such wait the API/worker spot readings were
approximately 438/768 MiB and below 1% CPU each. These are spot readings, **not
full-run resource peaks** or proof of headroom at a larger workload. The sampled
queue delay was dominated by the configured account request budget.

## Limits and cleanup

The offered workload was 60 audio minutes / 60 answers. The existing worker's
retry policy and conservative reservation accounting remained enabled; this is
not a new billing cap or an account-invoice reading. No payment/billing setting
was activated and no provider limit was increased.

All completed audio bytes were purged. Probe-owned accounts were disabled and
their exam links closed afterward. Temporary uploaded source audio and the probe
container were removed; the original owner Downloads file was preserved.
The existing candidate API returned HTTP 200. Public routing, production worker,
plan prices and the owner-preview account were not changed.

Details are private local artifacts under ignored
`loadtest-artifacts/groq-pressure-20261116/`. A repeatable client is stored at
`ops/loadtest/groq_pressure_probe.py`; it requires an isolated `*_loadtest`
PostgreSQL database, `LOAD_TEST_ENABLED=1`, the explicitly named private API and
an already authorized recording. Do not run it against production or activate a
paid account as part of this procedure.

These results do not establish 20 simultaneous recordings or 500 active students.
The existing 500-job/2-GiB queue admission cap and free provider's lower daily
audio quota still apply. Browser/biometric/email/payment load and diverse real
voices are outside this measurement.
