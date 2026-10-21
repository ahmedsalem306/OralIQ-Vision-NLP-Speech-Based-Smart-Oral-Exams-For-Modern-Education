import { Fragment } from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { AnswerSheet } from "./AnswerSheet";
import { NoteNumber, PenUnderline, QuestionNumber } from "./pen";

// Section widths follow their role per DESIGN.md: reading sections (marking scheme, steps) at 6xl,
// product shots and split sections at 7xl. avoid-ai-design-ignore-file: L6
const H2 = "font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.15] tracking-tight";

type L = (ar: string, en: string) => string;

/** 2a. Who we are, beside the product doing its job. On a phone the sheet follows the paragraph. */
function About({ l }: { l: L }) {
    const offer = [
        { href: "#lecturer", title: l("للمحاضر", "For lecturers"), body: l("الإجابات بتوصلك مصححة، ومعاها السبب.", "Answers arrive graded, with the reasons.") },
        { href: "#student", title: l("للطالب", "For students"), body: l("يمتحن من موبايله، من غير رهبة اللجنة.", "They take the exam on their phone, without the panel nerves.") },
        { href: "#integrate", title: l("لمنصتك", "For your platform"), body: l("الامتحان الشفوي كميزة جوّه منصتك.", "The oral exam as a feature inside your platform.") },
    ];
    return (
        <section id="about" className="scroll-mt-20 bg-sheet">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-16 gap-y-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:py-28">
                <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
                    <h2 className={H2}>{l("من نحن؟", "Who we are")}</h2>
                    <p className="mt-5 max-w-xl text-lg leading-[1.85] text-ink-2">
                        {l("OralIQ منصة عربية للامتحانات الشفوية أونلاين. الطالب بيجاوب بصوته، والمنصة بتحوّل إجابته لنص، وتقارن معناها بإجابة المحاضر النموذجية، وتتأكد إنه هو اللي بيجاوب. والمحاضر بيستلم كل إجابة مصححة ومعاها السبب.",
                            "OralIQ is an Arabic platform for online oral exams. Students answer out loud; the platform transcribes the answer, compares its meaning with the lecturer's model answer, and checks the right student is answering. The lecturer receives every answer graded, with the reasons.")}
                    </p>
                </div>
                <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
                    <AnswerSheet />
                </div>
                <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
                    <ul className="max-w-xl border-t border-rule-strong">
                        {offer.map((o) => (
                            <li key={o.href} className="border-b border-rule">
                                <a href={o.href} className="group flex items-center gap-4 py-4">
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-display text-lg font-semibold group-hover:text-pen">{o.title}</span>
                                        <span className="block text-ink-2">{o.body}</span>
                                    </span>
                                    <ArrowLeft className="size-5 shrink-0 text-ink-3 transition-transform group-hover:-translate-x-1 group-hover:text-pen ltr:rotate-180 ltr:group-hover:translate-x-1" aria-hidden />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/** 2b. The marking scheme as a real sheet, its figures large enough to remember (the real 80/10/10 weights). */
function MarkingScheme({ l }: { l: L }) {
    const weights = [
        { pct: 80, title: l("المحتوى", "Content"), body: l("إجابة الطالب بتتحوّل لنص، وبتتقارن بالإجابة النموذجية بالمعنى مش بالكلمات. لو قال نفس الفكرة بأسلوبه، بياخد حقه.", "The spoken answer is transcribed and compared with the model answer by meaning, not wording. The same idea in their own words earns full credit.") },
        { pct: 10, title: l("الطلاقة", "Fluency"), body: l("سرعة الكلام، والوقفات، وكلمات التردد زي «يعني» و«اه». بتأثر شوية، بس عمرها ما تضيّع إجابة صح.", "Speaking pace, pauses and filler words. It counts a little, but never sinks a correct answer.") },
        { pct: 10, title: l("النزاهة", "Integrity"), body: l("الكاميرا بترصد النظر بعيد عن الشاشة، أو موبايل أو كتاب قدام الطالب، وبتكتب ملاحظة يشوفها المحاضر.", "The camera notices looking away from the screen, or a phone or book in front of the student, and leaves a note for the lecturer.") },
    ];
    return (
        <section id="marking" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
                <h2 className={cn(H2, "max-w-3xl")}>{l("الدرجة بتتحسب بنفس الأوزان، لكل طالب، كل مرة.", "Every grade uses the same weights, for every student, every time.")}</h2>
                <p className="mt-5 max-w-2xl text-lg leading-[1.8] text-ink-2">{l("لو قال المعنى صح بأسلوبه بياخد حقه. ولو المحتوى أقل من 50% مايقدرش ينجح مهما كانت طلاقته.", "The right idea in their own words earns the marks; under 50% content can't pass, however fluent.")}</p>
                <div className="relative mt-14 overflow-hidden rounded-[20px] border border-rule-strong bg-sheet shadow-card">
                    <span className="absolute inset-y-0 start-8 w-px bg-mark/35 sm:start-12" aria-hidden />
                    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-4 pe-6 ps-14 sm:pe-10 sm:ps-20">
                        <p className="font-display font-semibold">{l("سلّم التصحيح", "Marking scheme")}</p>
                        <p className="text-sm text-ink-3">{l("الدرجة من 100", "Graded out of 100")}</p>
                    </div>
                    <dl className="grid md:grid-cols-3">
                        {weights.map((w, k) => (
                            <div key={w.pct + w.title} className={cn("border-b border-rule py-7 pe-6 ps-14 sm:ps-20 md:border-b-0 md:py-9 md:pe-8", k > 0 && "md:border-s md:ps-10")}>
                                {/* On a phone the figure sits beside its name; from tablet up, above it */}
                                <dt className="flex items-end gap-5 md:block">
                                    <span className="relative inline-block font-display text-[3.75rem] font-bold leading-none tracking-tight md:text-[clamp(4.5rem,8.5vw,7.25rem)]">
                                        <span className="ltr tabular">{w.pct}</span><span className="text-[0.4em] text-ink-3">%</span>
                                        <PenUnderline />
                                    </span>
                                    <span className="block font-display text-xl font-semibold md:mt-8 md:text-2xl">{w.title}</span>
                                </dt>
                                <dd className="mt-5 text-[1.0625rem] leading-relaxed text-ink-2 md:mt-3">{w.body}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="border-t border-rule bg-mark-wash/50 py-5 pe-6 ps-14 text-lg leading-relaxed sm:pe-10 sm:ps-20">
                        <strong className="font-semibold text-mark">{l("شرط الهوية:", "Identity rule:")}</strong>{" "}
                        {l("الوش 55% على الأقل والصوت 75% على الأقل، الاتنين مع بعض. ولو واحد منهم ما اتأكدش، الإجابة بتوصلك بتنبيه تراجعه بنفسك.",
                            "face at least 55% and voice at least 75%, both together. If either isn't confirmed, the answer reaches you flagged for your own review.")}
                    </p>
                </div>
            </div>
        </section>
    );
}

/**
 * Notes on the real results screen, placed on its answer-sheet drawer: `x`/`y` are % of the drawer.
 * The full screenshot shows the drawer across its left 46.56% (894 of 1920 px); a phone gets the
 * drawer alone (results-drawer.webp), where the same numbers apply directly.
 */
const NOTE_SPOTS = [{ x: 41.9, y: 15 }, { x: 50, y: 33.8 }, { x: 50, y: 59.8 }, { x: 33.5, y: 95 }];
const DRAWER = 894 / 1920;

/** 2c. The lecturer's side: the real results screen, large, marked up in red pen. */
function Results({ l }: { l: L }) {
    const notes = [
        l("الدرجة في دايرة حمرا، زي ما بتتكتب على الورقة.", "The grade, circled in red, as it would be on paper."),
        l("تفاصيلها: المحتوى والطلاقة والنزاهة، كل واحدة بوزنها.", "Its breakdown: content, fluency and integrity, each at its weight."),
        l("نص الإجابة زي ما الطالب قالها، علشان تراجع بنفسك.", "The answer as the student said it, so you can check it yourself."),
        l("الدرجة مخفية عن الطالب لحد ما تنشرها بضغطة.", "The student doesn't see the grade until you publish it, in one click."),
    ];
    return (
        <section id="lecturer" className="scroll-mt-20 border-y border-rule bg-sheet">
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
                <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16">
                    <h2 className={H2}>{l("للمحاضر: الإجابات بتوصلك مصححة.", "For lecturers: answers arrive graded.")}</h2>
                    <p className="max-w-xl text-lg leading-[1.8] text-ink-2">{l("امتحان شفوي لكل طلابك في نفس الوقت، وكل إجابة معاها نصها وتفاصيل درجتها وملاحظات النزاهة. تراجع وتنشر بضغطة.", "An oral exam for all your students at once; every answer comes with its transcript, grade breakdown and integrity notes. Review and publish in one click.")}</p>
                </div>
                <figure className="mt-14">
                    <div className="relative overflow-hidden rounded-[18px] border border-rule-strong shadow-float">
                        {/* A phone gets the answer sheet alone: the whole screen would be too small to read */}
                        <picture>
                            <source media="(max-width: 639px)" srcSet="/screens/results-drawer.webp" width={894} height={1200} />
                            <img src="/screens/results-1280.webp" srcSet="/screens/results-720.webp 720w, /screens/results-1280.webp 1280w, /screens/results.webp 1920w" sizes="(min-width: 1280px) 1216px, 100vw" width={1280} height={800} loading="lazy"
                                alt={l("صفحة نتائج المحاضر: قايمة الطلاب ودرجاتهم، وعلى الجنب ورقة إجابة طالب فيها الدرجة في دايرة حمرا وتفاصيلها ونص الإجابة وزرار النشر",
                                    "The lecturer's results page: the list of students and their grades, and beside it one student's answer sheet with the grade circled in red, its breakdown, the transcript and the publish button")}
                                className="block w-full" />
                        </picture>
                        {NOTE_SPOTS.map((s, k) => (
                            <Fragment key={k}>
                                <NoteNumber n={k + 1} className="absolute -translate-x-1/2 -translate-y-1/2 max-sm:hidden" style={{ left: `${s.x * DRAWER}%`, top: `${s.y}%` }} />
                                <NoteNumber n={k + 1} className="absolute -translate-x-1/2 -translate-y-1/2 sm:hidden" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
                            </Fragment>
                        ))}
                    </div>
                    <figcaption className="sr-only">{l("صفحة النتائج زي ما المحاضر بيشوفها، ببيانات تجريبية.", "The results page as a lecturer sees it, with sample data.")}</figcaption>
                </figure>
                <ol className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                    {notes.map((n, k) => (
                        <li key={k} className="flex items-start gap-3">
                            <NoteNumber n={k + 1} />
                            <p className="pt-2 leading-relaxed">{n}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** 2d. The student's side, on the one deep surface of the page. */
function Student({ l }: { l: L }) {
    const points = [
        { title: l("الكاميرا الأول، والسؤال بعدين", "Camera first, question second"), body: l("الطالب بيشوف نفسه ويظبط مكانه براحته. السؤال والوقت مبيبدأوش غير لما يدوس «ابدأ الإجابة».", "Students see themselves and settle in at their own pace. The question and the timer only start when they press Start answering.") },
        { title: l("نفس قبل الامتحان", "A breath before the exam"), body: l("لو حاسس بتوتر، فيه تمرين تنفس قصير جوّه صفحة الامتحان نفسها.", "If they feel nervous, there's a short breathing exercise on the exam page itself.") },
        { title: l("كلام مشجّع، مش أحكام", "Encouragement, not verdicts"), body: l("أضعف تقدير اسمه «يحتاج تقوية»، والتنبيهات بتقول له يعمل إيه، مش إيه اللي غلط فيه.", "The lowest band is called “Needs practice”, and alerts say what to do next, not what went wrong.") },
    ];
    return (
        <section id="student" className="scroll-mt-20 bg-navy text-navy-ink">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-28">
                <div>
                    <h2 className={cn(H2, "max-w-xl text-navy-ink")}>{l("للطالب: امتحان من غير رهبة اللجنة.", "For students: an exam without the panel nerves.")}</h2>
                    <p className="mt-5 max-w-xl text-lg leading-[1.8] text-navy-muted">{l("من بيته، ومن موبايله، وبصوته. وأول ما المحاضر ينشر، بيشوف درجته وتفاصيلها.", "From home, on their phone, in their own voice. As soon as the lecturer publishes, they see the grade and its breakdown.")}</p>
                    <ul className="mt-10 grid gap-7">
                        {points.map((p) => (
                            <li key={p.title} className="border-s-2 border-[#9DB2FF]/60 ps-5">
                                <h3 className="font-display text-lg font-semibold text-navy-ink">{p.title}</h3>
                                <p className="mt-1 leading-relaxed text-navy-muted">{p.body}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <figure className="mx-auto w-[min(14rem,64%)] lg:w-[min(17rem,78%)]">
                    <div className="rounded-[2.6rem] bg-[#05080F] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
                        <img src="/screens/exam-mobile-520.webp" srcSet="/screens/exam-mobile-520.webp 520w, /screens/exam-mobile.webp 780w" sizes="(min-width: 1024px) 272px, 224px" width={520} height={1125} loading="lazy"
                            alt={l("أوضة الامتحان على الموبايل: الكاميرا فوق، والسؤال على سطور، وزرار ابدأ الإجابة", "The exam room on a phone: the camera at the top, the question on ruled lines, and the Start answering button")}
                            className="w-full rounded-[2.1rem]" />
                    </div>
                </figure>
            </div>
        </section>
    );
}

/** 2e. The four steps, as the questions of an exam paper. */
function Steps({ l }: { l: L }) {
    const steps = [
        { title: l("اكتب السؤال وإجابته النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك. وحدّد الوقت والصعوبة.", "Type or dictate it, then set the time and difficulty.") },
        { title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد على جروب المادة، أو لطلاب معيّنين.", "One link to the class group, or to specific students.") },
        { title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد إنه هو.", "From a phone or laptop, while the camera confirms it's them.") },
        { title: l("الدرجة توصلك جاهزة", "The grade arrives ready"), body: l("مع نص الإجابة وتفاصيلها. تراجع وتنشر بضغطة.", "With the transcript and breakdown. Review and publish in one click.") },
    ];
    return (
        <section id="how" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
                <h2 className={cn(H2, "max-w-2xl")}>{l("من السؤال للدرجة، في أربع خطوات.", "From question to grade, in four steps.")}</h2>
                <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                    {steps.map((s, k) => (
                        <li key={s.title} className="relative lg:border-t lg:border-rule-strong lg:pe-8 lg:pt-8">
                            <QuestionNumber label={l(`س${k + 1}`, `Q${k + 1}`)} />
                            <h3 className="mt-4 font-display text-xl font-semibold leading-snug">{s.title}</h3>
                            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/**
 * 2. Who we are and what we offer, in five parts that each take their own shape: the about text
 * beside the live answer sheet, the marking scheme, the lecturer's results screen, the student's
 * side on navy, and the four steps.
 */
export function AboutOffer() {
    const { l } = useI18n();
    return (
        <>
            <About l={l} />
            <MarkingScheme l={l} />
            <Results l={l} />
            <Student l={l} />
            <Steps l={l} />
        </>
    );
}
