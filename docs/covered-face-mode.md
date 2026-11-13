# Covered-face accommodation — release candidate

The approved design is **voice verification plus human lecturer identity approval per exam**.
It is not iris biometrics or an automatic identity/cheating guarantee. Real niqab/camera
performance still needs a consenting pilot before enabling this for actual classes.

## Behavior

1. Enrollment offers male/female/prefer-not-to-say for UI choices only. Gender is not
   transmitted or stored. Female/unspecified students may choose covered-face mode and
   consent to the verification method and sharing the request with the exam lecturer.
2. Only a voice template is enrolled in that mode. No face photo/template is required.
   A mode change cannot occur while an exam sitting is active.
3. Opening an exam creates/resumes a pending request; it does not start the exam clock.
   The lecturer's dashboard shows a covered-face request and requires an explicit
   independent-identity-check checkbox before approval. Another lecturer/student cannot
   approve it. Rejection does not silently reset to pending on reload.
4. Approval applies to that exam only. Both admission and submission require it. Voice
   enrollment remains mandatory. Already-open sittings do not bypass a revoked approval.
5. Full-face/FaceMesh analysis is disabled for that student's exam. A bounded OpenCV eye
   region detector processes upper-camera still frames about every 4 seconds during
   recording. Frames are discarded; this does not enroll or compare an eye identity.
   It can fail or find false positives. No pupil-gaze direction or liveness is claimed.
6. If visibility cannot be read or the request fails/is busy, the UI says unavailable,
   requiring human review. It records no automatic cheating penalty from that state.
   Grades have no invented face/integrity score; content/fluency follow the existing
   missing-integrity weighting. Reports carry `covered_approved` and
   `[MANUAL REVIEW REQUIRED]`, and lecturer student lists identify this mode.

## Data and rollout

New additive tables: `biometric_preferences` and `exam_accommodations`. Normal startup's
SQLAlchemy metadata initialization creates them; take and test a DB backup before rollout.
Requests retain the exam/student/lecturer, decision, reviewer and timestamps. Scope these
records to the relevant lecturer; do not export them as a public list. Existing face
templates are not silently erased when a student chooses a different mode; privacy/deletion
requests must include any retained older template and its backups.

Frontend and backend must deploy together. Publishing the new enrollment UI while pointing
at the old HF API will fail its new endpoints, so do not deploy the UI alone to main.
The purchased server's OS/version/resources and secure access still require verification.

## Validation scope

Three accommodation tests passed, covering approval ownership, no self-approval, mandatory independent identity
confirmation, voice requirement, per-exam scope, active-mode-change refusal, nullable face
scores and eye-visibility fallback. The eye detector was exercised on a generated blank
image; **no real student face/eye accuracy or production capacity test has been run**.

Browser console checks: current live login and local privacy release showed no new console
errors during observation. The Vercel preview redirected to Vercel authentication; its
Google FedCM console messages were from the Vercel login page, not OralIQ. Authenticated
enrollment/exam and real-device camera/microphone tests still need staging credentials and
consenting participants. A clean public-page console does not mean full production readiness.

The 19 student-access/privacy tests passed after explicitly adding `identity_mode` to the
student response shape; no other fields were exposed. Sixteen frontend tests, typecheck,
targeted lint (two existing `any` warnings) and final production build passed. Normal grading
queue regression cases also passed in the combined backend run. These are local checks,
not a successful server deployment or a real biometric/device evaluation.
