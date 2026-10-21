import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Mic, RotateCcw, ScanFace } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { ScoreMark } from "../ui/score-mark";

/** Sample answer, written out per language (sample data, labelled as such under the sheet). */
const SAMPLE = {
    ar: {
        course: "مبادئ الذكاء الاصطناعي", of: "سؤال 2 من 3", name: "عمر خالد",
        question: "عرّف الذكاء الاصطناعي، واذكر مثالين على استخدامه.",
        answer: "الذكاء الاصطناعي هو قدرة الآلة إنها تفكّر وتتعلّم من البيانات وتاخد قرارات، زي المساعد الصوتي في الموبايل وترشيحات الفيديوهات.",
        keywords: ["تتعلّم", "البيانات", "قرارات،"],
        marks: [["المحتوى", 94], ["الطلاقة", 86], ["النزاهة", 100]] as const,
        identity: "الهوية متأكدة", grade: "الدرجة 92 من 100", caption: "مثال لطريقة التصحيح، ببيانات تجريبية", again: "تاني",
    },
    en: {
        course: "Intro to Artificial Intelligence", of: "Question 2 of 3", name: "Omar Khaled",
        question: "Define artificial intelligence and give two examples of its use.",
        answer: "Artificial intelligence is a machine's ability to think, learn from data and make decisions, like the voice assistant on a phone and video recommendations.",
        keywords: ["learn", "data", "decisions,"],
        marks: [["Content", 94], ["Fluency", 86], ["Integrity", 100]] as const,
        identity: "Identity confirmed", grade: "Grade 92 out of 100", caption: "An example of how grading works, with sample data", again: "Again",
    },
};

/**
 * 0 waiting, 1 recording, 2 writing the transcript, 3 marking, 4 graded. Plays once when the sheet
 * scrolls into view. Visitors who prefer reduced motion get the graded sheet straight away (they
 * never adopt the pre-rendered page, so their first render may differ from it).
 */
function useSheetSequence(start: boolean, words: number) {
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState(0);
    const [shown, setShown] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [run, setRun] = useState(0);
    const settled = reduce || !start ? null : run;

    useEffect(() => {
        if (settled === null) return;
        const timers: ReturnType<typeof setTimeout>[] = [];
        let tick: ReturnType<typeof setInterval> | undefined;
        timers.push(setTimeout(() => {
            setPhase(1); setShown(0); setSeconds(0);
            tick = setInterval(() => setSeconds((s) => Math.min(s + 3, 42)), 130);
        }, 400));
        timers.push(setTimeout(() => {
            if (tick) clearInterval(tick);
            setPhase(2);
            tick = setInterval(() => setShown((n) => { if (n >= words) { if (tick) clearInterval(tick); return n; } return n + 1; }), 95);
        }, 2400));
        const written = 2400 + words * 95 + 300;
        timers.push(setTimeout(() => setPhase(3), written));
        timers.push(setTimeout(() => setPhase(4), written + 1100));
        return () => { timers.forEach(clearTimeout); if (tick) clearInterval(tick); };
    }, [settled, words]);

    if (reduce) return { phase: 4, shown: words, seconds: 42, replay: null };
    return { phase, shown, seconds, replay: () => setRun((r) => r + 1) };
}

/**
 * An answer sheet that records, writes and grades itself: the student's spoken answer is
 * written onto the ruled lines, the keywords are underlined, and the grade is circled in red.
 */
export function AnswerSheet() {
    const { lang } = useI18n();
    const t = SAMPLE[lang === "en" ? "en" : "ar"];
    const words = t.answer.split(" ");
    const keywords = new Set<string>(t.keywords);
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.35 });
    const { phase, shown, seconds, replay } = useSheetSequence(inView, words.length);
    const recording = phase === 1;

    return (
        <figure ref={ref} className="relative mx-auto w-full max-w-[34rem]">
            <div className="relative rounded-[10px] bg-sheet shadow-float ring-1 ring-rule lg:-rotate-[1.4deg]">
                {/* The exam sheet's red margin rule */}
                <span className="absolute inset-y-0 start-7 w-px bg-mark/35 sm:start-11" aria-hidden />
                <div className="pe-6 ps-12 pt-5 sm:pe-8 sm:ps-16">
                    <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
                        <span>{t.course}</span>
                        <span className="tabular">{t.of}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 border-b border-rule pb-3 text-xs text-ink-3">
                        <span>{t.name}</span>
                        <span className="ltr tabular">2021034</span>
                    </div>
                    <p className="mt-4 font-display text-lg font-semibold leading-snug sm:text-xl">{t.question}</p>

                    {/* Recording strip */}
                    <div className="mt-4 flex items-center gap-3 rounded-full border border-rule bg-paper px-3 py-2">
                        <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", recording ? "bg-mark text-pen-ink" : "bg-pen-wash text-pen")}>
                            {recording && <span className="absolute inset-0 rounded-full bg-mark/40 motion-safe:animate-[oiq-pulse-ring_1.4s_ease-out_infinite]" aria-hidden />}
                            <Mic className="relative size-3.5" aria-hidden />
                        </span>
                        <span className="flex h-6 flex-1 items-center gap-[3px]" aria-hidden>
                            {Array.from({ length: 30 }).map((_, i) => (
                                <span
                                    key={i}
                                    className={cn("w-[3px] origin-center rounded-full", recording ? "bg-mark/80 motion-safe:animate-[oiq-eq_0.9s_ease-in-out_infinite]" : "bg-ink-3/40")}
                                    style={{ height: `${28 + Math.abs(Math.sin(i * 0.8) * 50 + Math.sin(i * 0.31) * 22)}%`, animationDelay: `${(i % 7) * 0.09}s` }}
                                />
                            ))}
                        </span>
                        <span className="ltr shrink-0 text-xs font-semibold tabular text-ink-2">0:{String(seconds).padStart(2, "0")}</span>
                    </div>
                </div>

                {/* The answer, written onto ruled lines */}
                <div
                    className="relative mt-3 min-h-[9.5rem] pb-4 pe-6 ps-12 text-[1.0625rem] leading-[36px] text-pen sm:pe-8 sm:ps-16"
                    style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 35px, var(--rule) 35px 36px)" }}
                >
                    <p className="sr-only">{t.answer}</p>
                    <p aria-hidden>
                        {words.map((w, i) => (
                            <motion.span
                                key={i}
                                initial={false}
                                animate={{ opacity: i < shown ? 1 : 0 }}
                                transition={{ duration: 0.18 }}
                                className={cn("inline", phase >= 3 && keywords.has(w) && "underline decoration-pen decoration-2 underline-offset-[7px]")}
                            >
                                {w}{" "}
                            </motion.span>
                        ))}
                    </p>
                </div>

                {/* The grader's marks */}
                <div className="relative flex min-h-[8.5rem] items-end justify-between gap-4 border-t border-dashed border-rule-strong pb-5 pe-6 ps-12 pt-4 sm:pe-8 sm:ps-16">
                    <motion.ul
                        initial={false}
                        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 6 }}
                        transition={{ duration: 0.35 }}
                        className="grid gap-1 font-display text-sm font-semibold text-mark"
                    >
                        {t.marks.map(([k, v]) => (
                            <li key={k} className="flex items-baseline gap-2">
                                <span>{k}</span><span className="ltr tabular">{v}</span>
                            </li>
                        ))}
                        <li className="mt-2 inline-flex w-fit -rotate-2 items-center gap-1.5 whitespace-nowrap rounded border-2 border-pass px-2 py-0.5 text-xs text-pass">
                            <ScanFace className="size-3.5" aria-hidden />{t.identity}
                        </li>
                    </motion.ul>
                    <div className="min-h-32">{phase >= 4 && <ScoreMark score={92} size="xl" animate label={t.grade} className="max-sm:h-24 max-sm:w-40" />}</div>
                </div>
            </div>
            <figcaption className="mt-5 flex items-center justify-center gap-3 text-sm text-ink-3">
                <span>{t.caption}</span>
                {phase >= 4 && replay && (
                    <button type="button" onClick={replay} className="inline-flex min-h-8 items-center gap-1 font-semibold text-pen hover:underline">
                        <RotateCcw className="size-3.5" aria-hidden />{t.again}
                    </button>
                )}
            </figcaption>
        </figure>
    );
}
