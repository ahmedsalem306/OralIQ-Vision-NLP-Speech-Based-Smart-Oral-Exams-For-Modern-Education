# Local speech-model comparison — November 15, 2026

Whisper small improved CPU throughput on the purchased VPS, but visibly added
Arabic transcription distortions in the owner's short recording. It was **not
adopted** as the grading model. This sample does not establish acceptable exam
accuracy or fast results for 500 students.

## Method

- Same candidate image `oraliq-backend:fc8ba0e`, 5-vCPU/14-GiB container ceiling,
  deterministic application decoding, word timestamps, local SBERT content grading.
- Public `Systran/faster-whisper-small` weights were downloaded into an isolated
  VPS cache, pinned at revision `536b0662742c02347bc0e980a01041f333bce120`.
  The download container had no recording mounted. Inference containers had no
  network, no application database or credentials, and a read-only model cache.
  No model weights were downloaded to the owner's Windows machine.
- One original 34.539-second owner recording, plus eight minute-long pipeline
  jobs on that recording repeated/trimmed to 60 seconds. One speaker; no diverse
  student answers, voice matching, camera checks, browser flow or full exam run.
- Warm-up excluded. Each configuration completed four full-minute jobs. The
  comparison below uses earlier medium measurements with the same resource
  ceiling and composed audio; it is not a randomized or simultaneous benchmark.

| Model | Concurrent jobs / threads each | Four-job wall time | Answers/minute | Per-job wall time | Peak process RSS |
| --- | --- | ---: | ---: | ---: | ---: |
| Medium, earlier baseline | 2 / 2 | 204.052 s | 1.1762 | 100.023–102.144 s | 3013.6 MiB |
| Small | 2 / 2 | 68.531 s | 3.5021 | 30.816–37.183 s | 1964.2 MiB |
| Medium, earlier comparison | 4 / 1 | 155.171 s | 1.5467 | 153.020–155.154 s | 4267.0 MiB |
| Small | 4 / 1 | 57.660 s | 4.1623 | 55.449–57.651 s | 2497.2 MiB |

Small increased measured throughput approximately 3.0x / 2.7x over the respective
medium samples. Its four transcripts were identical within each configuration.
The original recording's warm pipeline completed in 19.005 seconds. Visible word
distortions remained and increased in the inspected original transcript. No
word-error-rate accuracy percentage or teacher-validated grading result is claimed;
internal content/fluency scores are not transcription-accuracy measurements.

Even the faster sampled small configuration would take approximately 240 minutes
to drain 1,000 similar answers (`1000 / 4.1623`). This is an extrapolation, not a
measured 500-student result, and excludes monitoring, identity checks and other
live load. It does not solve fast large-cohort grading by itself.

## Decision and cleanup

Keep the current medium model and production concurrency/pending limits unchanged.
Defer new paid transcription integration and package pricing until a bounded
pilot establishes acceptable transcript quality, grading delay and workload.
Successful test execution alone does not approve the smaller model for exams.

Inference containers were removed and uploaded owner-audio copies were deleted.
The private candidate API returned HTTP 200 afterward. Detailed transcripts and
numeric reports are restricted local artifacts under
`loadtest-artifacts/local-model-20261115/`, outside Git. The separate downloaded
weights remain cached on the VPS for repeatable experiments. Public routing and
the maintenance state were not changed.

See the [earlier capacity assessment](server-capacity-2026-11-15.md) for the
separate HTTP admission tests and existing production queue limits.

Implementation reference: [faster-whisper](https://github.com/SYSTRAN/faster-whisper).
