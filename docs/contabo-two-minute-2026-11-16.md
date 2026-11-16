# Current release: Contabo, two-minute exams and licensed face models

This supersedes the earlier Vercel/50/200-attempt proposal. The owner explicitly
confirmed **two minutes for the entire exam** and **USD 20/month for the VPS**.
No paid provider plan or software license was purchased or activated.

## Student participation is the billing unit

| Plan | Monthly EGP | Student exam participations | Example |
| --- | ---: | ---: | --- |
| Free | 0, trial once | 5 lifetime | five students each sit once |
| Basic | 199 | 150 / 30 days | 150 students × one exam |
| Professional | 599 | 600 / 30 days | 150 students × four exams, or 100 × six |
| Enterprise | quote | bounded agreed allowance | size and schedule measured first |

A participation starts one student's timed sitting. The same 100 students sitting
four exams use 400, fitting Professional. Basic's spare 50 after 100 students
sit once can be used by another 50 sittings. This is not a distinct-student count
or a promise that 150 can be recorded simultaneously. Credits reserve when the
student presses Start answering, not while viewing instructions/camera preview.
Resuming the same sitting is free; a new retake or manual retry batch consumes
another credit. Abandoning an already-started sitting does not refund it.

An exam may have one two-minute question or two one-minute questions. Creation
and new admission enforce the sum, not just individual question limits. The
server clock has zero default reading grace; instructions/camera permissions
are completed first. The existing 90-second upload grace accepts a transfer
started near the deadline, not additional recorded answer time. Accepted
answers move on to the next question without waiting for a transcription result.
Each job captures its question's 60/120-second audio bound on the server;
thread-local decoding enforces it before external transcription, so sending two
overlong files cannot turn a two-minute exam into four billed audio minutes.

Paid cycle rollover, owner/assistant sharing, expiry/completion behavior and
atomic seat/credit reservation from the previous release remain. Shared launch
admission is ten active students across every account. It is a conservative
pilot guard, not certification of ten real camera/voice sessions.

## Cost and margin, without Vercel

Run `python ops/costs/launch_costs.py`. The default frontend hosting cost is zero:
Nginx serves the static website on the purchased VPS. GoDaddy's domain renewal
still exists; it is covered by the planning reserve, not confused with hosting.

At a **planning** FX rate of 60 EGP/USD:

- VPS: 20 USD = **1,200 EGP/month** (owner-specified price, FX an assumption).
- Domain amortization/off-site storage/mail/alerts reserve: **300 EGP/month**.
- Free-trial usage reserve: **200 EGP/month**, an estimate, not a global signup
  spend cap. At full two-minute trial use it covers about 144 trial accounts.
- Shared fixed planning budget: **1,700 EGP/month**.
- Groq Large V3 paid-rate assumption: USD 0.111/hour. Two audio minutes cost
  EGP 0.222; adding a 25% retry/tax buffer gives **EGP 0.2775 per participation**.
  Free-tier usage is not relied on for the margin calculation.
- Domestic card fee assumption: Kashier published **2.75% + EGP 3**, plus
  14% VAT on that fee only; the merchant contract/payment method takes precedence.
- An additional 10% of revenue is reserved for support/refunds/contingencies.
- Face model royalty budget: **zero** for the pinned MIT/Apache-2.0 alternative.
  Retain notices; no InsightFace weight license is being assumed or purchased.

| Maximum monthly use | Basic | Professional |
| --- | ---: | ---: |
| Audio minutes | 300 | 1,200 |
| Buffered audio cost, EGP | 41.62 | 166.50 |
| Card fee including fee VAT, EGP | 9.66 | 22.20 |
| Support/refund reserve, EGP | 19.90 | 59.90 |
| Contribution before shared fixed costs, EGP | 127.82 | 350.40 |
| Break-even monthly subscribers, all on this tier | 14 | 5 |
| Subscribers targeting a 30% operating margin | 25 | 10 |

Mixed accounts add their contributions. Ten Professional monthly subscriptions
produce revenue EGP 5,990 and about **EGP 1,804 operating surplus (30.1%)** after
the estimated EGP 1,700 fixed budget. Five yield only about EGP 52, not a useful
profit buffer. These are estimates before sales/profit taxes, salary and marketing,
not guaranteed net profit. Prepaid term/year discounts reduce the contribution;
the calculator includes their maximum allowance counts and a 3x retry stress.

Free Groq admission still allows only 108 audio minutes/hour and 432/day in our
configuration. At two-minute maximums that is 54/216 participations' audio before
other usage/retries. A 150-student class is not guaranteed immediate free-tier
results. Commercial speech billing/limits require account configuration and
spend monitoring; they were not silently enabled by this release.

## Face model replacement

Identity now uses **YuNet + SFace on CPU**. The app no longer imports or loads
InsightFace face weights. Models are explicitly provisioned by the operator;
an enrollment request never downloads weights. File size and SHA-256 are verified
before load. Full notices and licenses ship in `backend/app/assets/face-licenses/`.
OpenCV Zoo revision: `48b10fa505aeb51fbd127fc60a5c660040e823b7`.

- YuNet 2023mar, 232,589 bytes, MIT:
  `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`.
- SFace 2021dec, 38,696,353 bytes, Apache-2.0:
  `0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79`.

Templates use a model namespace and a finite normalized 128-dimensional vector.
Every old unversioned template, including both 128-dimensional face-api templates
and 512-dimensional ArcFace templates, is stale and must be reenrolled. They are
not silently compared with a new model. Old results are preserved. Enrollment
requires one face in each sample; OpenCV mutable inference objects are serialized.
The existing conservative 0.55 cosine gate/review band is retained, not presented
as a calibrated threshold for all students/devices or an accuracy percentage.

The actual purchased-server probe used two public OpenCV sample images, a mild
lighting/JPEG variation, a blank image and repeated concurrent checks. It passed
same/different/blank checks. On a two-CPU container: cold load about **0.337 s**;
20 checks offered from 10 threads in **1.674 s**, latency p95 **0.867 s**, process
peak RSS **275 MiB**. These are direct service timings, not HTTP/camera/liveness
measurements or a diverse-student accuracy study. Sample images were removed.
The covered-face path remains voice plus lecturer approval and experimental
eye visibility; this replacement does not claim iris identity or liveness.

## Hosting and current deployment boundary

- Frontend build, API URLs, canonical site and production fallback now target
  Contabo: `/api/v1` and `https://oralliq.com`. No fallback sends exams to HF/Vercel.
- Vercel Git deployments are disabled in the legacy `frontend/vercel.json`;
  no Vercel plan was activated and no unrelated existing deployment was deleted.
- Static files are deployed under `/srv/oraliq-web/releases/two-minute-20261116-final`.
  Host Nginx serves them; no Node dev server is required in production.
- Local Nginx checks passed for the homepage, exam route, privacy/refund pages,
  asset caching and nonexistent-asset 404. The API-maintenance route returns 503.
- `nginx.frontend.oralliq.conf` prepares apex HTTPS and www-to-apex redirection.
  GoDaddy DNS must contain only **A @ = 217.76.56.223** and **CNAME www = oralliq.com**
  for the website. Existing API/email records are preserved. HTTPS issuance must
  wait until both authoritative nameservers agree, without old parking IPs.
- The owner removed the residual `A @ Parked` record. Both authoritative
  GoDaddy nameservers and Cloudflare then returned only `217.76.56.223`.
  Certbot issued the apex/www certificate using the existing ACME account.
  The frontend is now live over HTTPS, with www returning 301 to the apex.
  Server-pinned TLS hostname verification passed for the homepage/exam/privacy/
  refund routes (HTTP 200). `/api/v1/health` on the website still returns
  intentional maintenance 503; this is a frontend launch, not full API activation.
- API cutover still requires the drained candidate/schema rollout, off-site
  restore/alerts and final mail/auth checks. Do not describe a staged homepage
  or a model benchmark as a complete public production launch.

Validation: the final full Linux/Python 3.12 suite passed **497 tests with zero
failures/errors/skips**, including the real PostgreSQL concurrency cases. Frontend
typecheck, lint and build passed, plus **16 Node tests**. Lint retains warnings.
Private reports live under ignored `loadtest-artifacts/contabo-two-minute-20261116/`.

Primary sources: [OpenCV YuNet model/license](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet),
[SFace model/license](https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface),
[OpenCV inference documentation](https://docs.opencv.org/4.x/d0/dd4/tutorial_dnn_face.html),
[Groq speech pricing](https://console.groq.com/docs/speech-to-text),
[Kashier pricing](https://www.kashier.io/pricing).
