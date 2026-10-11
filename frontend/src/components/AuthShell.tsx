import { Link } from "react-router-dom";
import { Mic } from "lucide-react";
import Logo from "./Logo";
import LanguageToggle, { ThemeToggle } from "./LanguageToggle";
import { ScoreMark } from "./ui/score-mark";
import { useI18n } from "../i18n";

/** A graded answer sheet — what OralIQ produces, shown instead of a stock photo. */
export function SampleSheet() {
    const { l } = useI18n();
    const rows = [
        { label: l("المحتوى", "Content"), value: 94 },
        { label: l("الطلاقة", "Fluency"), value: 86 },
        { label: l("النزاهة", "Integrity"), value: 100 },
    ];
    return (
        <figure
            aria-label={l("مثال لإجابة مصحّحة", "Example of a graded answer")}
            className="relative w-full max-w-md rotate-[-1.2deg] rounded-[var(--radius-panel)] border border-rule bg-sheet p-6 shadow-pop sm:p-7"
        >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
                <div>
                    <p className="text-sm text-ink-3">{l("سؤال 2 من 3", "Question 2 of 3")}</p>
                    <p className="mt-1 font-display text-lg font-semibold leading-snug">
                        {l("عرّف الذكاء الاصطناعي واذكر مثالين على استخدامه", "Define artificial intelligence and give two examples of its use")}
                    </p>
                </div>
                <ScoreMark score={92} size="lg" animate />
            </div>

            <div className="flex items-center gap-2 py-4 text-pen" aria-hidden>
                <Mic className="size-4 shrink-0" />
                <svg viewBox="0 0 240 28" className="h-7 w-full" preserveAspectRatio="none">
                    {Array.from({ length: 48 }).map((_, i) => {
                        const h = 4 + Math.abs(Math.sin(i * 0.9) * 10 + Math.sin(i * 0.37) * 8);
                        return <rect key={i} x={i * 5} y={14 - h / 2} width="2.4" height={h} rx="1.2" fill="currentColor" opacity={i < 34 ? 1 : 0.3} />;
                    })}
                </svg>
                <span className="text-xs tabular text-ink-3 ltr">1:12</span>
            </div>

            <blockquote className="border-s-2 border-pen/40 ps-3 text-[0.95rem] leading-relaxed text-ink-2">
                {l("الذكاء الاصطناعي هو قدرة الآلة على محاكاة التفكير البشري، زي المساعدات الصوتية وتشخيص الأشعة…",
                    "AI is a machine's ability to imitate human thinking — like voice assistants and reading X-rays…")}
            </blockquote>

            <dl className="mt-5 grid grid-cols-3 border-t border-rule pt-4">
                {rows.map((r) => (
                    <div key={r.label}>
                        <dt className="text-xs text-ink-3">{r.label}</dt>
                        <dd className="font-display text-lg font-semibold tabular">{r.value}</dd>
                    </div>
                ))}
            </dl>
        </figure>
    );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
    const { l } = useI18n();
    return (
        <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Form side */}
            <div className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Link to="/" aria-label="OralIQ"><Logo size={30} /></Link>
                    <div className="flex items-center gap-1"><LanguageToggle compact /><ThemeToggle /></div>
                </div>
                <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
                <p className="text-center text-xs text-ink-3">© 2026 OralIQ</p>
            </div>

            {/* Brand side — ruled like an exam booklet */}
            <aside
                className="relative hidden flex-col justify-center overflow-hidden border-s border-rule bg-sheet-2 px-12 py-16 lg:flex xl:px-20"
                style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, var(--rule) 39px, var(--rule) 40px)" }}
            >
                <div className="relative max-w-lg">
                    <h2 className="text-[2.4rem] font-bold leading-[1.25] xl:text-[2.75rem]">
                        {l("الطالب يجاوب بصوته، والتصحيح يوصلك جاهز.", "Students answer out loud. You get the grading done.")}
                    </h2>
                    <p className="mt-4 max-w-md text-lg text-ink-2">
                        {l("OralIQ بيحوّل الإجابة لنص، ويقارنها بإجابتك النموذجية، ويتأكد إن الطالب هو اللي بيجاوب.",
                            "OralIQ transcribes each answer, compares it with your model answer, and checks the right student is answering.")}
                    </p>
                    <div className="mt-12"><SampleSheet /></div>
                </div>
            </aside>
        </div>
    );
}
