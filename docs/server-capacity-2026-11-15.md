# VPS capacity assessment — November 15, 2026

The measured CPU speech pipeline is too slow to promise fast results for a
500-student, two-question school exam. This is a finding about the present
Whisper medium pipeline/resource allocation, not a claim that the purchased VPS
cannot run the web application or database.

## Measured inference

- VPS: 8 vCPUs, 23.47 GiB RAM, AMD EPYC virtual CPU. About 20.7 GiB was available
  before the tests. Grading was limited to the same 5-vCPU/14-GiB ceiling as the
  candidate worker, leaving other services their configured allocation.
- Actual image `oraliq-backend:fc8ba0e`; faster-whisper 1.2.1, CTranslate2 4.8.5,
  PyAV 19.0.2, Torch 2.15.0+cpu and sentence-transformers 5.7.0.
- Eight real ASR/NLP inference jobs. Each input was 60 seconds of speech composed
  by repeating/trimming the owner's 34.539-second Arabic clip. It is one speaker
  and a constructed workload, not diverse real student answers. Each output had
  115 words and a finite content score; no accuracy certification is implied.
- Model: Whisper medium, actual `int8_float32`, deterministic transcription and
  local content grading. Voice matching, eye/face monitoring and real browsers
  were excluded. Models ran offline from the server cache.

| Configuration | Jobs | Per-job wall time | Total batch | Answers/minute | Peak process RSS |
| --- | --- | --- | --- | --- | --- |
| Current: 2 jobs, 2 threads/job | 4 | 100.023–102.144 s | 204.052 s | 1.1762 | 3013.6 MiB |
| Comparison: 4 jobs, 1 thread/job | 4 | 153.020–155.154 s | 155.171 s | 1.5467 | 4267.0 MiB |

The comparison improved aggregate throughput about 31.5%, while increasing the
individual answer's processing latency. Mean CPU use was 3.741 and 3.930 cores;
observed host steal was 0% in both samples. This was not a complete parameter
search, a saturation test of all eight vCPUs or a quality evaluation of a faster
model. Production concurrency/thread settings were not changed.

## Estimated queue drain, not measured class results

These are `students × 2 / measured answers-per-minute`, assuming a queue large
enough to admit every answer, similar audio, stable resource availability and no
additional camera/voice-match load. Warm-up is excluded. They are not a grading
SLA or results from actually completing 1,000 inference jobs.

| Students | Answers | Current configuration | Comparison configuration |
| --- | --- | --- | --- |
| 10 | 20 | 17.0 min | 12.9 min |
| 25 | 50 | 42.5 min | 32.3 min |
| 50 | 100 | 85.0 min | 64.7 min |
| 100 | 200 | 170.0 min | 129.3 min |
| 500 | 1000 | 850.2 min (~14 h) | 646.5 min (~11 h) |

## Measured receiving/storage admission

This separate test used synthetic, non-personal AAC noise: 60.064 seconds and
485,549 bytes per file. Five hundred fixture identities started server-side
sittings over HTTP, then submitted two waves of 500 files. A maximum of ten HTTP
uploads ran concurrently. There was no grading worker on the isolated database.
No personal audio or real biometric templates were inserted into that database.

| Isolated queue setting | Question 1 | Question 2 | Stored jobs | Upload-wave wall times |
| --- | --- | --- | --- | --- |
| Current limit: 500 | 500 accepted | 500 rejected (503 capacity) | 500 | 55.306 s + 36.589 s |
| Comparison limit: 1200 | 500 accepted | 500 accepted | 1000 | 58.757 s + 54.222 s |

All 500 access checks passed in each case. In the 1200-limit case, request p95
was 1.8949/1.4475 seconds and the entire seeded-access/submission scenario was
160.378 seconds. This excludes an external student's network and does not prove
500 simultaneous active uploads, camera streams, registration or payments.
The two fixture cohorts had matching submission/job counts (500/500
and 1000/1000), no orphan answers, and zero retained synthetic audio after cleanup.
Both cases ran in the separate `*_loadtest` database. Production's queue limit
remains 500, so it must not be advertised as admitting 1,000 pending answers.

## Decision boundaries and cleanup

The existing VPS can remain the web/database host while a faster local speech
configuration/model or separately scalable grading service is evaluated. If
hours-long deferred grading is acceptable, queue size and student/lecturer
waiting behavior must be deliberately configured and the full monitoring/browser
workload validated before accepting a large school exam. Increasing queued jobs
does not increase speech throughput.

Raw owner upload copies were removed, constructed personal audio remained only
in anonymous worker temporary files and memory, and test containers were removed.
The upload tests used non-personal generated noise; their jobs were marked as
ended without inference and their audio cleared. Detailed numeric reports are
local under `loadtest-artifacts/capacity-20261115`, outside Git. Candidate health
returned 200 after testing. No production setting or frontend routing changed.
