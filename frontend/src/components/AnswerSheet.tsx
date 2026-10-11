import { Clock, Mic, ScanFace } from "lucide-react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import { ScoreMark } from "./ui/score-mark";
import { Badge } from "./ui/badge";
import { gradeOf, formatScore, type Tone } from "../lib/grades";
import { formatDate, formatDuration, parseServerDate } from "../lib/format";
import type { Submission } from "../lib/types";

/** Thresholds mirror backend/app/api/endpoints/exams.py and face.py */
const FACE = { verified: 55, mismatch: 45 };
const VOICE = { verified: 75, mismatch: 60 };

type CheckState = "verified" | "uncertain" | "mismatch" | "missing";

function checkState(score: number | null, t: { verified: number; mismatch: number }): CheckState {
    if (score == null) return "missing";
    if (score >= t.verified) return "verified";
    if (score < t.mismatch) return "mismatch";
    return "uncertain";
}

const checkTone: Record<CheckState, Tone> = { verified: "pass", uncertain: "warn", mismatch: "mark", missing: "neutral" };

/**
 * Backend reports are Arabic plain text: blocks joined by " | ", lines with "  • " bullets,
 * plus emoji/English identity lines we render separately as structured checks.
 */
function parseReport(text: string | null): { heading: string[]; bullets: string[] } {
    const heading: string[] = [];
    const bullets: string[] = [];
    (text || "")
        .split("\n")
        // " | " joins report blocks at top level, but inside a bullet it separates two facts on one line
        .flatMap((line) => (line.trim().startsWith("•") ? [line.replace(/\s\|\s/g, "، ")] : line.split(/\s\|\s/)))
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !/identity/i.test(s))
        .forEach((line) => {
            if (line.startsWith("•")) bullets.push(line.replace(/^•\s*/, ""));
            else if (!/:$/.test(line)) heading.push(line.replace(/^(?:✅|⚠️|🚨|\s)+/u, ""));
        });
    return { heading, bullets };
}

function Section({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("border-t border-rule pt-5", className)}>
            <h3 className="mb-3 text-[0.9375rem] font-semibold">{title}</h3>
            {children}
        </section>
    );
}

function Breakdown({ s }: { s: Submission }) {
    const { l } = useI18n();
    const rows = [
        { label: l("المحتوى", "Content"), hint: l("مقارنة بالإجابة النموذجية", "Against the model answer"), weight: 80, value: s.nlp_score },
        { label: l("الطلاقة", "Fluency"), hint: l("التردد والتوقف والسرعة", "Hesitation, pauses, pace"), weight: 10, value: s.speech_score },
        { label: l("النزاهة", "Integrity"), hint: l("المراقبة بالكاميرا", "Camera proctoring"), weight: 10, value: s.facial_score },
    ];
    return (
        <dl className="space-y-4">
            {rows.map((r) => (
                <div key={r.weight + r.label}>
                    <div className="flex items-baseline justify-between gap-3">
                        <dt>
                            <span className="font-semibold">{r.label}</span>
                            <span className="ms-2 text-sm text-ink-3">{r.hint}</span>
                            <span className="ms-2 text-xs text-ink-3">{l(`(${r.weight}% من الدرجة)`, `(${r.weight}% of grade)`)}</span>
                        </dt>
                        <dd className="shrink-0 font-display font-semibold tabular ltr">
                            {formatScore(r.value)}{r.value != null && <span className="text-sm text-ink-3">%</span>}
                        </dd>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden>
                        <div
                            className={cn("h-full rounded-full", r.value != null && r.value < 50 ? "bg-mark" : "bg-pen")}
                            style={{ width: `${Math.max(0, Math.min(100, r.value ?? 0))}%` }}
                        />
                    </div>
                </div>
            ))}
        </dl>
    );
}

export function AnswerSheet({ s, viewer }: { s: Submission; viewer: "lecturer" | "student" }) {
    const { l, lang } = useI18n();
    const g = gradeOf(s.overall_score);
    const fluency = parseReport(s.fluency_report);
    const integrity = parseReport(s.cheat_report);
    const start = parseServerDate(s.started_at);
    const end = parseServerDate(s.finished_at || s.submitted_at);
    const duration = start && end && end > start ? formatDuration((end.getTime() - start.getTime()) / 1000) : null;

    const face = checkState(s.face_score, FACE);
    const voice = checkState(s.voice_score, VOICE);
    const checkLabel = (st: CheckState) => ({
        verified: l("مطابق", "Match"),
        uncertain: l("غير مؤكد", "Uncertain"),
        mismatch: l("غير مطابق", "No match"),
        missing: l("لا توجد قراءة", "No reading"),
    })[st];

    return (
        <article className="space-y-6">
            {/* Head: question + the mark */}
            <header className="flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-ink-3">{s.question_category || l("السؤال", "Question")}</p>
                    <h2 className="mt-1 text-xl font-semibold leading-snug">{s.question_text || l("سؤال محذوف", "Deleted question")}</h2>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                        <span>{formatDate(s.submitted_at, lang, true)}</span>
                        {duration && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{l(`مدة الإجابة ${duration}`, `Answered in ${duration}`)}</span>}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                    <ScoreMark score={s.overall_score} size="xl" animate />
                    {g ? <Badge tone={g.tone}>{l(g.ar, g.en)}</Badge> : <Badge>{l("قيد التصحيح", "Being graded")}</Badge>}
                </div>
            </header>

            {s.overall_score != null && (
                <Section title={l("تفاصيل الدرجة", "How the grade was made")}>
                    <Breakdown s={s} />
                    {s.nlp_score != null && s.nlp_score < 50 && (
                        <p className="mt-4 text-sm text-ink-2">
                            {l("المحتوى أقل من 50%، فالدرجة النهائية لا تتعدى 49.9% مهما كانت باقي العناصر.",
                                "Content is under 50%, so the final grade is capped at 49.9% regardless of the rest.")}
                        </p>
                    )}
                </Section>
            )}

            <Section title={l("إجابة الطالب كما سُمعت", "The answer as heard")}>
                {s.transcript ? (
                    <blockquote className="rounded-[var(--radius-control)] border-s-[3px] border-pen/50 bg-sheet-2 px-4 py-3 text-[1.0625rem] leading-loose" dir="auto">
                        {s.transcript}
                    </blockquote>
                ) : (
                    <p className="text-ink-3">{l("لم يُلتقط كلام في التسجيل.", "No speech was picked up in the recording.")}</p>
                )}
            </Section>

            {(fluency.heading.length > 0 || fluency.bullets.length > 0) && (
                <Section title={l("الطلاقة", "Fluency")}>
                    {fluency.heading.map((h) => <p key={h} className="font-medium">{h}</p>)}
                    {fluency.bullets.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 ps-5 text-ink-2 marker:text-ink-3">
                            {fluency.bullets.map((b) => <li key={b}>{b}</li>)}
                        </ul>
                    )}
                </Section>
            )}

            {viewer === "lecturer" && (
                <>
                    <Section title={l("التحقق من الهوية", "Identity checks")}>
                        <ul className="divide-y divide-rule rounded-[var(--radius-control)] border border-rule">
                            {[
                                { icon: ScanFace, name: l("الوجه", "Face"), st: face, score: s.face_score, need: FACE.verified },
                                { icon: Mic, name: l("الصوت", "Voice"), st: voice, score: s.voice_score, need: VOICE.verified },
                            ].map(({ icon: Icon, name, st, score, need }) => (
                                <li key={name} className="flex items-center gap-3 px-4 py-3">
                                    <Icon className="size-[18px] text-ink-3" aria-hidden />
                                    <div className="flex-1">
                                        <p className="font-semibold">{name}</p>
                                        <p className="text-xs text-ink-3">{l(`يُعتبر مطابقاً من ${need}%`, `Counts as a match from ${need}%`)}</p>
                                    </div>
                                    {score != null && <span className="font-display font-semibold tabular ltr">{formatScore(score)}%</span>}
                                    <Badge tone={checkTone[st]}>{checkLabel(st)}</Badge>
                                </li>
                            ))}
                        </ul>
                        {(face === "uncertain" || voice === "uncertain") && (
                            <p className="mt-3 text-sm text-ink-2">
                                {l("القراءة في المنطقة الرمادية. راجع التسجيل أو اطلب من الطالب إعادة الامتحان قبل نشر الدرجة.",
                                    "The reading is borderline. Check the recording or ask the student to retake before publishing.")}
                            </p>
                        )}
                    </Section>

                    <Section title={l("المراقبة أثناء الإجابة", "Proctoring")}>
                        {integrity.heading.length === 0 && integrity.bullets.length === 0 ? (
                            <p className="text-ink-2">{l("لم يُرصد أي سلوك غير عادي.", "Nothing unusual was detected.")}</p>
                        ) : (
                            <>
                                {integrity.heading.map((h) => <p key={h} className="font-medium">{h}</p>)}
                                {integrity.bullets.length > 0 && (
                                    <ul className="mt-2 list-disc space-y-1 ps-5 text-ink-2 marker:text-ink-3">
                                        {integrity.bullets.map((b) => <li key={b}>{b}</li>)}
                                    </ul>
                                )}
                            </>
                        )}
                        <p className="mt-3 text-sm text-ink-3">
                            {l("النظر بعيداً لوحده مش دليل غش — هو مؤشر للمراجعة بس.", "Looking away alone isn't proof of cheating — it's a cue to review.")}
                        </p>
                    </Section>
                </>
            )}
        </article>
    );
}
