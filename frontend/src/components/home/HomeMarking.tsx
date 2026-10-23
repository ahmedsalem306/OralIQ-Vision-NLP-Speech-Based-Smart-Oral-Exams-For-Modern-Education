import { useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { H2, Section } from "./ui";

/** The lecturer's results page as the visitor's theme shows it. */
function ResultsShot({ l, theme }: { l: (ar: string, en: string) => string; theme: "light" | "dark" }) {
    const base = theme === "light" ? "/screens/results" : "/screens/results-dark";
    return (
        <picture>
            <source media="(max-width: 639px)" srcSet={`${base}-drawer.webp`} width={894} height={1200} />
            <img src={`${base}-1280.webp`} srcSet={`${base}-720.webp 720w, ${base}-1280.webp 1280w, ${base}.webp 1920w`}
                sizes="(min-width: 1024px) 40vw, 100vw" width={1280} height={800} loading="lazy" decoding="async"
                alt={l("صفحة نتائج المحاضر: درجة الطالب وتفاصيلها في المحتوى والطلاقة والنزاهة، ونص إجابته", "The lecturer's results page: the student's grade, its breakdown into content, fluency and integrity, and the answer's transcript")}
                className="block h-auto w-full" />
        </picture>
    );
}

/**
 * 3. How a grade is made: the real weights (80 content, 10 fluency, 10 integrity) as tabs beside
 * the lecturer's results screen. Arrow keys move between the tabs.
 */
export function HomeMarking() {
    const { l } = useI18n();
    const [active, setActive] = useState(0);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const weights = [
        { pct: 80, title: l("المحتوى", "Content"), body: l("بنحوّل كلام الطالب لنص ونقارنه بإجابتك النموذجية بالمعنى مش بالكلمات. اللي فهم وقال الفكرة بأسلوبه بياخد حقه، واللي محتواه أقل من 50% مش هينجح مهما كانت طلاقته.", "We turn the spoken answer into text and compare it with your model answer by meaning, not wording. A student who understood and said it their own way gets the credit; under 50% content can't pass, however fluent.") },
        { pct: 10, title: l("الطلاقة", "Fluency"), body: l("سرعة الكلام والوقفات وكلمات التردد زي «يعني» و«اه». ليها وزن صغير، وعمرها ما تضيّع إجابة صح.", "Speaking pace, pauses and filler words. It carries a small weight and never sinks a correct answer.") },
        { pct: 10, title: l("النزاهة", "Integrity"), body: l("الكاميرا بتلاحظ لو الطالب بص بعيد كتير، أو كان قدامه موبايل أو كتاب، وبتكتبلك ملاحظة تراجعها.", "The camera notices long looks away from the screen, or a phone or book in front of the student, and leaves you a note to review.") },
    ];
    const w = weights[active];

    // The tabs stand in a column on wide screens and a row on phones, so both arrow pairs move,
    // following the reading direction
    const onKey = (e: React.KeyboardEvent, i: number) => {
        const rtl = document.documentElement.dir === "rtl";
        const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const back = e.key === "ArrowUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft");
        if (!forward && !back) return;
        e.preventDefault();
        const next = (i + (forward ? 1 : -1) + weights.length) % weights.length;
        setActive(next);
        tabs.current[next]?.focus();
    };

    return (
        <Section id="marking" tone="a">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
                <h2 className={cn(H2, "max-w-3xl")}>{l("درجة عادلة لكل طالب، بنفس المقياس كل مرة.", "A fair grade for every student, on the same scale every time.")}</h2>
                <p className="mt-5 max-w-2xl text-lg leading-[1.8] text-home-muted">{l("أول طالب وآخر طالب بيتصححوا بنفس الطريقة، من غير تعب آخر اليوم.", "The first student and the last are marked the same way, with no end-of-day fatigue.")}</p>

                <div className="mt-14 grid gap-10 lg:grid-cols-[11rem_minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
                    <div role="tablist" aria-label={l("أوزان الدرجة", "Grade weights")} className="flex gap-2 overflow-x-auto lg:flex-col">
                        {weights.map((t, i) => (
                            <button
                                key={t.title}
                                ref={(el) => { tabs.current[i] = el; }}
                                type="button"
                                role="tab"
                                id={`mark-tab-${i}`}
                                aria-selected={i === active}
                                aria-controls="mark-panel"
                                tabIndex={i === active ? 0 : -1}
                                onClick={() => setActive(i)}
                                onKeyDown={(e) => onKey(e, i)}
                                className={cn("flex min-h-11 shrink-0 items-center justify-between gap-4 rounded-lg px-4 text-start transition-colors", i === active ? "bg-home-card text-home-ink" : "text-home-muted hover:text-home-ink")}
                            >
                                <span>{t.title}</span><span className="ltr text-sm tabular">{t.pct}%</span>
                            </button>
                        ))}
                    </div>

                    {/* The real screen, in the visitor's own theme: a white screenshot would glare
                        in the dark one. A phone gets the answer sheet alone, which stays readable. */}
                    <figure className="overflow-hidden rounded-2xl border border-home-line">
                        <div className="home-light-only"><ResultsShot l={l} theme="light" /></div>
                        <div className="home-dark-only"><ResultsShot l={l} theme="dark" /></div>
                    </figure>

                    <div role="tabpanel" id="mark-panel" aria-labelledby={`mark-tab-${active}`}>
                        <p className="font-display text-[clamp(3.5rem,6vw,5rem)] font-extralight leading-none"><span className="ltr tabular">{w.pct}</span><span className="text-[0.45em] text-home-muted">%</span></p>
                        <h3 className="mt-5 font-display text-2xl font-normal">{w.title}</h3>
                        <p className="mt-3 leading-[1.8] text-home-muted">{w.body}</p>
                        <p className="mt-8 border-t border-home-line pt-5 text-sm leading-relaxed text-home-muted">
                            <span className="font-semibold text-home-ink">{l("شرط الهوية:", "Identity rule:")}</span>{" "}
                            {l("الوش 55% على الأقل والصوت 75% على الأقل، الاتنين مع بعض. ولو واحد منهم ما اتأكدش، الإجابة بتوصلك بتنبيه، وانت اللي تقرر.",
                                "face at least 55% and voice at least 75%, both together. If either isn't confirmed, the answer reaches you flagged, and you decide.")}
                        </p>
                    </div>
                </div>
            </div>
        </Section>
    );
}
