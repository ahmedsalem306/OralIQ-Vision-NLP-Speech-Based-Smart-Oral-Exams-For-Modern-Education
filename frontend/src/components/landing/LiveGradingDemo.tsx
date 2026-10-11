import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { ScoreMark } from "../ui/score-mark";

/** 0 recording → 1 transcribing → 2 scoring → 3 graded */
type Stage = 0 | 1 | 2 | 3;

const TRANSCRIPT = {
    ar: "الذكاء الاصطناعي هو قدرة الآلة على محاكاة التفكير البشري والتعلم من البيانات، زي المساعدات الصوتية وتشخيص الأشعة.",
    en: "Artificial intelligence is a machine's ability to mimic human thinking and learn from data, like voice assistants and reading X-rays.",
};
const KEYWORDS = {
    ar: ["محاكاة", "التفكير", "البيانات،", "المساعدات"],
    en: ["mimic", "thinking", "data,", "assistants"],
};

const WORD_MS = 115;

/**
 * The product in one card: a spoken answer becomes text, the text becomes a grade.
 * Plays while visible, loops, and shows the finished result when motion is reduced.
 */
export function LiveGradingDemo({ className }: { className?: string }) {
    const { l, lang } = useI18n();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.35 });
    const reduce = useReducedMotion();
    const words = TRANSCRIPT[lang].split(" ");
    const keys = KEYWORDS[lang];
    const wordCount = words.length;

    const [stage, setStage] = useState<Stage>(0);
    const [shown, setShown] = useState(0);

    useEffect(() => {
        if (!inView || reduce) return;
        const timers: number[] = [];
        const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
        const run = () => {
            at(0, () => { setStage(0); setShown(0); });
            const talk = 1700;
            at(talk, () => setStage(1));
            for (let i = 0; i < wordCount; i++) at(talk + 200 + i * WORD_MS, () => setShown(i + 1));
            const typed = talk + 200 + wordCount * WORD_MS + 250;
            at(typed, () => setStage(2));
            at(typed + 1300, () => setStage(3));
            at(typed + 1300 + 5200, run);
        };
        run();
        return () => timers.forEach(clearTimeout);
    }, [inView, reduce, wordCount]);

    const s: Stage = reduce ? 3 : stage;
    const n = reduce ? words.length : shown;

    const bars = [
        { label: l("المحتوى", "Content"), value: 94, color: "bg-pen" },
        { label: l("الطلاقة", "Fluency"), value: 86, color: "bg-violet" },
        { label: l("النزاهة", "Integrity"), value: 100, color: "bg-teal" },
    ];

    return (
        <div ref={ref} className={cn("rounded-[22px] border border-rule/70 bg-sheet/95 p-4 shadow-float backdrop-blur-md sm:p-5", className)}>
            {/* Status */}
            <div className="flex items-center justify-between gap-3">
                <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300",
                    s === 0 ? "bg-mark-wash text-mark" : s < 3 ? "bg-pen-wash text-pen" : "bg-pass-wash text-pass",
                )} aria-live="polite">
                    {s === 0 ? (
                        <>
                            <span className="relative flex size-2"><span className="absolute inset-0 rounded-full bg-mark motion-safe:animate-[oiq-pulse-ring_1.4s_ease-out_infinite]" /><span className="relative size-2 rounded-full bg-mark" /></span>
                            {l("بيسجّل إجابته…", "Recording…")}
                        </>
                    ) : s < 3 ? (
                        <><Sparkles className="size-3.5 motion-safe:animate-pulse" aria-hidden />{l("بيصحّح…", "Grading…")}</>
                    ) : (
                        <><Check className="size-3.5" aria-hidden />{l("اتصحّحت", "Graded")}</>
                    )}
                </span>
                <span className="text-xs text-ink-3">{l("سؤال 2 من 3", "Question 2 of 3")}</span>
            </div>

            <p className="mt-3 font-display text-[0.9375rem] font-semibold leading-snug">{l("عرّف الذكاء الاصطناعي واذكر مثالين", "Define AI and give two examples")}</p>

            {/* Spoken answer → text */}
            <div className="relative mt-3 h-[5.5rem] overflow-hidden rounded-xl bg-sheet-2 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-2">
                {s === 0 ? (
                    <div className="flex h-full items-center justify-center gap-[3px]" aria-hidden>
                        {Array.from({ length: 34 }).map((_, i) => (
                            <span
                                key={i}
                                className="w-[3px] origin-center rounded-full bg-pen/70 motion-safe:animate-[oiq-eq_1.1s_ease-in-out_infinite]"
                                style={{ height: `${30 + Math.abs(Math.sin(i * 0.7) * 50 + Math.sin(i * 0.23) * 20)}%`, animationDelay: `${i * -0.09}s` }}
                            />
                        ))}
                    </div>
                ) : (
                    <p dir="auto">
                        {words.slice(0, n).map((w, i) => (
                            <motion.span
                                key={i}
                                initial={reduce ? false : { opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                transition={{ duration: 0.25 }}
                                className={cn(keys.includes(w) && "rounded bg-pen-wash px-0.5 font-medium text-pen")}
                            >
                                {w}{" "}
                            </motion.span>
                        ))}
                        {s === 1 && <span className="inline-block h-3.5 w-[2px] translate-y-0.5 bg-pen motion-safe:animate-pulse" aria-hidden />}
                    </p>
                )}
            </div>

            {/* Breakdown */}
            <ul className="mt-3 space-y-2">
                {bars.map((b, i) => (
                    <li key={b.label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs">
                        <span className="text-ink-2">{b.label}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-rule">
                            <motion.span
                                className={cn("block h-full rounded-full", b.color)}
                                initial={false}
                                animate={{ width: s >= 2 ? `${b.value}%` : "0%" }}
                                transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1], delay: reduce || s < 2 ? 0 : i * 0.12 }}
                            />
                        </span>
                        <span className={cn("text-end font-display font-semibold tabular transition-opacity duration-300", s >= 2 ? "opacity-100" : "opacity-0")}>{b.value}</span>
                    </li>
                ))}
            </ul>

            {/* Result */}
            <div className="mt-3 flex h-16 items-center justify-between border-t border-rule pt-3">
                <span className="text-xs text-ink-3">{l("الدرجة النهائية", "Final grade")}</span>
                {s === 3 ? (
                    <span className="flex items-center gap-2">
                        <span className="rounded-md bg-pass-wash px-2 py-0.5 text-xs font-semibold text-pass">{l("ممتاز", "Excellent")}</span>
                        <ScoreMark key={reduce ? "static" : `run-${shown}`} score={92} size="md" animate={!reduce} />
                    </span>
                ) : (
                    <span className="h-6 w-24 rounded-md bg-rule/60 oiq-skeleton" aria-hidden />
                )}
            </div>
        </div>
    );
}
