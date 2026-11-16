# Launch prices, operating budget and server decision — 16 November 2026

**Superseded:** the owner subsequently chose Contabo-only hosting, a two-minute
whole exam, and 150/600 monthly student participations. See
[the current release](contabo-two-minute-2026-11-16.md). The arithmetic below
records the earlier six-minute/50/200 proposal; it is not the current offer.

The owner specified **USD 20/month for the purchased server**. This is the only
confirmed recurring invoice input. No paid provider plan or subscription was
activated, and public routing has not been changed by this work.

## Prepared subscriptions

| Plan | EGP / 30 days | Student exam starts | Exam links | Questions / answer limit |
| --- | ---: | ---: | ---: | --- |
| Free | 0, once | 5 lifetime | 5 lifetime | 2 questions, 3 minutes each |
| Basic (`pro`) | 199 | 50 | 15 | 2 questions, 3 minutes each |
| Professional (`campus`) | 599 | 200 | 30 | 2 questions, 3 minutes each |
| Enterprise | separately quoted | bounded admin-assigned allowance | contracted | same launch audio bound |

One attempt is one student's start of an exam, including both questions. Fifty
students each taking one exam consume 50 attempts; the same 25 students taking
two exams also consume 50. The allowance is shared with assistants. Opening the
same active sitting again consumes nothing. A retake, an abandoned start, or a
new manual retry batch for an exhausted failed grading job consumes a credit.
Automatic retries and provider quota waits do not consume extra student credits.

Credit reservation and the new sitting commit together. Atomic SQL protects the
last credit; cycle rollover uses the same account lock. Paid expiry blocks new
starts during the read-access grace period while existing sittings may finish.
Deleting an exam cannot reset the lifetime counter. Add-on packs that only add
links are disabled until they can include a properly priced processing allowance;
existing purchased bonus links are not removed.

Paid credits renew every 30 days without rollover. Existing four-month/annual
discounts remain: 597/1,797 EGP per four-month term; 1,990/5,990 EGP yearly. A
365-day year can open a 13th allowance at day 360, accounted for by the calculator.
These discounts reduce the average monthly contribution below the table below.

## Cost assumptions and reproducible arithmetic

Use `python ops/costs/launch_costs.py`. All margins below are estimates, not net
profit guarantees. The calculation deliberately charges every included minute
at the paid rate, even if a free quota would cover part of it.

- USD/EGP **60 is a planning rate**, not a claim about the live exchange rate or
  the bank's final foreign-card conversion rate.
- Groq `whisper-large-v3`: **USD 0.111/audio hour**; six minutes = USD 0.0111 =
  EGP 0.666 at that planning rate. A 25% combined retry/tax buffer makes this
  EGP **0.8325 per fully used student attempt**. This is an expected buffer,
  not a mathematical cap on all retry or account charges. A separate 3x processing
  stress scenario is included in the calculator.
- Kashier published domestic online card fee: **2.75% + EGP 3**, with 14% VAT
  **on the payment fee**, subject to the actual merchant agreement/method.
- An additional **10% of revenue** is reserved for support/refunds/contingencies.
- Fixed server: 20 × 60 = **EGP 1,200/month**. Estimated domain amortization,
  off-site storage, mail and alert reserve: **EGP 300/month**. Free-trial reserve:
  **EGP 200/month**; this is a budget assumption, not an implemented global spend
  cap on lecturer signups. At full trial use it covers about 48 free lecturers.
- Vercel's Hobby plan is for personal noncommercial use. Budget a separate
  **USD 20/month minimum** for one Pro seat if retaining Vercel commercially;
  taxes, extra seats and usage may add more. This was not purchased. Hosting the
  static frontend on the already purchased VPS instead removes that fee, but
  that alternative has not been deployed or selected on the owner's behalf.
- The face-weight commercial fee is **unquoted and excluded**. Enter an actual
  monthly amortization with `--face-license-egp` before treating the figures as a
  complete commercial budget. Sales/profit taxes, salaries and marketing are
  also excluded. Provider invoices/merchant rates supersede these assumptions.

| At full monthly allowance | Basic 199 | Professional 599 |
| --- | ---: | ---: |
| Audio minutes included at maximum length | 300 | 1,200 |
| Buffered audio budget, EGP | 41.62 | 166.50 |
| Card fee including fee VAT, EGP | 9.66 | 22.20 |
| 10% support/refund reserve, EGP | 19.90 | 59.90 |
| Contribution **before shared fixed costs**, EGP | **127.82** | **350.40** |

Do not call 127.82/350.40 net profit per subscriber: these contributions must
first pay all shared monthly bills. License costs and excluded expenses further
reduce the actual result.

| Shared monthly budget / all customers on one monthly plan | Basic-only | Professional-only |
| --- | ---: | ---: |
| VPS frontend scenario: EGP 1,700; break-even subscribers | 14 | 5 |
| VPS frontend scenario: subscribers targeting 30% operating margin | 25 | 10 |
| Vercel Pro scenario: EGP 2,900; break-even subscribers | 23 | 9 |
| Vercel Pro scenario: subscribers targeting 30% operating margin | 43 | 17 |

Mixed subscriptions add their contributions together. For example, 10 Basic +
10 Professional monthly subscriptions produce revenue EGP 7,980 and about EGP
4,782 contribution; after an estimated EGP 2,900 fixed budget, operating surplus
is about **EGP 1,882 (23.6%)**, before the excluded expenses. Five Professional
subscriptions yield only about EGP 52 surplus in the EGP 1,700 scenario and a loss
of about EGP 1,148 in the EGP 2,900 scenario. Customer count matters; reducing
credits alone cannot guarantee profit with very few customers.

## Purchased server: keep it for a bounded launch

The purchased Ubuntu VPS has eight vCPUs and about 24 GiB RAM. A live quiet-time
snapshot on 16 November showed about **20,011 MiB RAM available and 276 GiB disk
free**, including the production candidate and separate preview/test services.
These are not load peaks. The earlier two preview cohorts completed 20/40 real
Groq grading jobs without failed answers in about 67/133 seconds from first
upload. That test excluded actual camera, voice verification and varied speakers.

**Decision: retain the server for a limited pilot; a hardware upgrade is not
justified by these measurements.** Launch admission defaults to **10 active
students across all lecturers**, not ten per subscriber. A full platform returns
503 + Retry-After for new entrants; existing seated students can continue.
Per-account seats (5 Free / 10 paid) are separate from cumulative credits. A
higher enterprise seat number cannot override the shared ceiling. This is an
operational protection, not certification that ten real biometric sessions passed.

The free Groq configuration still caps admission at 18 requests/minute, 108 audio
minutes/hour and 432/day. At maximum six-minute attempts, that is only **18 new
attempts' audio/hour and 72/day across all teachers** (less when prior usage or
retries count). Do not sell a school an immediate 200-student run using this
quota. Commercial Groq billing/limits must be explicitly set from the account's
actual limits and guarded with spend/queue monitoring before promising throughput.
No account limit was raised or billing activated here. A 500-student real
camera/identity run remains unproven and is not advertised by these launch plans.

## Face-model license, precisely

The code's `FaceAnalysis` defaults to **`buffalo_sc`** in
`backend/app/services/face_biometrics.py`. InsightFace's library code is MIT;
the supplied pretrained weights are separately limited to noncommercial
research. The fact they run correctly does not grant commercial permission.
No price, license acceptance or purchase has been inferred.

A possible no-license-fee replacement is OpenCV Zoo's **YuNet + SFace**, whose
model directories publish MIT/Apache-2.0 licenses. These are candidates only:
no replacement was installed or accuracy certified. SFace's 128-dimensional
templates differ from existing 512-dimensional ArcFace templates, so switching
requires an explicit model version, reenrollment and identity-threshold tests;
simply changing a model filename would be unsafe. The covered-face workflow
still uses voice and lecturer identity approval, with experimental eye-region
visibility; it does not identify someone by their iris.

## Primary sources checked 16 November 2026

- [Groq speech pricing and models](https://console.groq.com/docs/speech-to-text)
- [Groq account limits](https://console.groq.com/docs/rate-limits)
- [Kashier published card pricing](https://www.kashier.io/pricing)
- [Vercel pricing](https://vercel.com/pricing) and [fair use](https://vercel.com/docs/limits/fair-use-guidelines)
- [InsightFace model terms](https://github.com/deepinsight/insightface/blob/master/python-package/docs/model_zoo.md)
- [YuNet license](https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/LICENSE)
- [SFace license](https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/LICENSE)

## Deployment boundary

This release prepares and tests prices/admission in source. The public site,
candidate's active provider, billing configuration and account balances were not
changed. The API remains publicly in maintenance. Before cutover: back up and
migrate the added user counters, drain old active sittings/jobs because the audio
bound changes, resolve the face weights, configure off-site restore/alerts and
commercial speech capacity, then perform the production-domain smoke check.

## Validation

- Full final Linux/Python 3.12 suite: **488 passed, zero failures/errors/skips**,
  including real PostgreSQL last-credit, cycle-rollover and shared-seat races in
  disposable schemas. No live SMTP or inference-provider calls were used.
- New HTTP checks cover one credit for resume/two answers, a second credit for
  retakes, owner/assistant sharing, quota exhaustion allowing existing completion,
  expiry grace, and failed admission rolling back its seat and credit together.
- Frontend typecheck, lint and production build passed; **16 Node tests passed**.
  Lint still reports warnings; no browser automation or 500-camera test is claimed.
- Validated backend archive SHA-256:
  `01a1b712616e4adaab15948140a553f562c92024e40ba1cc8f2e3c83a4b6c011`.
  Private XML/log/JSON/cost evidence is in ignored
  `loadtest-artifacts/launch-pricing-20261116/`; it is not published to Git.
- Candidate health remained HTTP 200; no production rollout occurred. The
  earlier full run exposed fixtures with old five-minute exams and a checkout
  for a now-disabled link-only add-on. Fixtures were aligned to launch limits;
  the historical add-on refund/freeze check still verifies preserved paid rows.
