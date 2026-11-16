# Conservative Arabic scoring text — November 16, 2026

This change improves limited transcription-noise tolerance during local content
grading. It does not rewrite the stored transcript or the student's "as heard"
display, and it never constructs an answer from the grading reference.

## Change

Semantic comparison previously took the best of the original text and a broadly
phonetic, stemmed, stop-word-filtered version. That second version could delete
negation and quantities or collapse distinct Arabic letters and names.

The semantic encoder now receives the original and a conservative alternative:
NFC, Arabic vowel-mark/tatweel cleanup, common alef spelling normalization and a
fixed context-bound alias such as `ذكاء استناعي` to `ذكاء اصطناعي`. Negation,
quantities, word order and other spelling are preserved. Standalone ambiguous
words and university/person names are not guessed from a reference answer.

Broad phonetic matching remains only in the existing secondary keyword signal.
Weights, thresholds, transcription, fluency grading and original evidence storage
are unchanged. No new model, external request or paid correction service is added.

## Real cached-model comparison

An isolated network-disabled CPU container loaded the existing cached multilingual
MiniLM model once, shared it between old/new analyzers and compared six text-only
cases. No recordings were uploaded and no model weights were downloaded.

| Case | Earlier content grade | Updated content grade |
| --- | ---: | ---: |
| Same-topic AI answer with the context-bound typo | 96.7 | 100.0 |
| Correct identical AI answer/reference | 100.0 | 100.0 |
| Screenshot-style AI/university answer against e-learning reference | 28.0 | 21.7 |
| E-learning paraphrase | 61.6 | 62.1 |
| Negated-claim diagnostic | 100.0 | 78.0 |
| Changed-quantity diagnostic | 100.0 | 94.8 |

These are outputs of the grading algorithm, **not accuracy percentages or human
grading labels**. The first checks establish bounded typo handling and that the
unrelated answer stays unrelated. The last two expose an unresolved limitation:
embedding similarity plus fuzzy keywords does not establish factual agreement,
logical entailment or correct quantities. Preserving evidence helps but does not
solve that limitation. Do not treat these diagnostics as successful factual grading.
Retain lecturer review/publication and calibrate grading against human judgments
before using scores for consequential decisions or enabling public instant results.

The screenshot's content mark measures agreement with the e-learning reference;
it is not an estimate that speech recognition is only 28% accurate.

## Verification and deployment

Focused local regression checks: **19 passed** without model downloads or external
calls. They cover the fixed alias, orthographic cleanup/idempotence, preserving
negation/quantities/names, not guessing standalone words and keeping the original
evidence through grading. Full Linux verification: **469 passed, 0 failed,
0 skipped**, including the existing PostgreSQL concurrency/queue regressions.

Only fresh answers in the private owner preview are eligible for an updated
worker; the private owner-preview worker was updated after validation. Previously
saved grades/transcripts are not modified. Production and the
public frontend remain unchanged. Detailed probe reports are private artifacts
under ignored `loadtest-artifacts/nlp-20261116/`.
