import { useRef } from "react";
import { Mic, ScanFace } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/** Step number circled in ballpoint blue: the same hand-drawn loop as the grade mark. */
function StepNumber({ n }: { n: number }) {
    return (
        <span className="relative flex h-12 w-16 items-center justify-center">
            <svg viewBox="-6 -4 132 88" preserveAspectRatio="none" className="absolute inset-0 h-full w-full -rotate-3 overflow-visible text-pen" aria-hidden>
                <path d="M92 10C113 17 121 44 102 62C82 80 33 80 14 63C-3 48 6 19 33 9C53 2 80 3 98 15" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            </svg>
            <span className="relative font-display text-xl font-bold text-pen tabular">{n}</span>
        </span>
    );
}

function Bar({ label, value, tone = "bg-pen" }: { label: string; value: number; tone?: string }) {
    return (
        <div>
            <span className="flex items-center justify-between text-sm">
                <span className="text-ink-2">{label}</span>
                <span className="font-display font-semibold tabular" dir="ltr">{value}%</span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-rule">
                <span data-bar className={cn("block h-full origin-[100%] rounded-full ltr:origin-[0%]", tone)} style={{ width: `${value}%` }} />
            </span>
        </div>
    );
}

/**
 * 2. Who we are, and what we offer: one short paragraph, then the product shown as it is,
 * in four rounded cards (lecturer, student, identity, grading), then the four steps.
 * Cards rise as they enter; the screenshots inside drift up a little slower than the page.
 */
export function AboutOffer() {
    const { l } = useI18n();
    const root = useRef<HTMLElement>(null);

    useGSAP(() => {
        withMotion(() => {
            gsap.from("[data-about-copy] > *", { y: 32, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: "[data-about-copy]", start: "top 82%" } });
            gsap.from("[data-card]", { y: 70, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: "[data-cards]", start: "top 80%" } });
            gsap.utils.toArray<HTMLElement>("[data-shot]").forEach((el) => {
                gsap.fromTo(el, { yPercent: 18 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 35%", scrub: true } });
            });
            gsap.from("[data-bar]", { scaleX: 0, duration: 1.2, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: "[data-cards]", start: "top 60%" } });
            gsap.from("[data-step]", { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: "[data-steps]", start: "top 85%" } });
            gsap.fromTo("[data-steps-line]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: "[data-steps]", start: "top 80%", end: "bottom 60%", scrub: true } });
        });
    }, { scope: root });

    const steps = [
        { title: l("اكتب السؤال والإجابة النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك، وحدد الوقت والصعوبة.", "Type or dictate it; set the time and difficulty.") },
        { title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد على جروب المادة، أو لطلاب بعينهم.", "One link to the class group, or to specific students.") },
        { title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد إنه هو.", "From a phone or laptop, while the camera confirms it's them.") },
        { title: l("الدرجة توصلك جاهزة", "The grade arrives ready"), body: l("مع نص الإجابة وتفاصيلها، وتنشرها بضغطة.", "With the transcript and breakdown; publish in one click.") },
    ];

    return (
        <section ref={root} id="about" className="scroll-mt-20 bg-sheet">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
                <div data-about-copy className="mx-auto max-w-3xl text-center">
                    <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight tracking-tight">{l("من نحن؟", "Who we are")}</h2>
                    <p className="mt-5 text-lg leading-loose text-ink-2 sm:text-xl">
                        {l("OralIQ منصة عربية للامتحانات الشفوية أونلاين. الطالب بيجاوب بصوته، والمنصة بتحوّل إجابته لنص، وتقارن معناها بإجابة المحاضر النموذجية، وتتأكد إنه هو اللي بيجاوب. والمحاضر بيستلم كل إجابة مصححة ومعاها السبب.",
                            "OralIQ is an Arabic platform for online oral exams. Students answer out loud; the platform transcribes the answer, compares its meaning with the lecturer's model answer, and checks the right student is answering. The lecturer receives every answer graded, with the reasons.")}
                    </p>
                </div>

                <div data-cards className="mt-16 grid gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
                    {/* Lecturer: the results page */}
                    <article data-card className="relative flex flex-col overflow-hidden rounded-[28px] border border-rule bg-paper lg:col-span-2">
                        <div className="p-8 pb-0 sm:p-10 sm:pb-0">
                            <h3 className="text-2xl font-bold">{l("للمحاضر: الإجابات بتوصلك مصححة", "For lecturers: answers arrive graded")}</h3>
                            <p className="mt-2 max-w-lg leading-relaxed text-ink-2">{l("امتحان شفوي لكل طلابك في نفس الوقت، وكل إجابة معاها نصها وتفاصيل درجتها وملاحظات النزاهة. تراجع وتنشر بضغطة.", "An oral exam for all your students at once; every answer comes with its transcript, grade breakdown and integrity notes. Review and publish in one click.")}</p>
                        </div>
                        <div className="mt-8 overflow-hidden px-8 sm:px-10">
                            <img data-shot src="/screens/results.webp" alt={l("صفحة النتائج عند المحاضر", "The lecturer's results page")} width={1920} height={1200} loading="lazy" className="block w-full rounded-t-[18px] border border-b-0 border-rule shadow-float" />
                        </div>
                    </article>

                    {/* Student: the exam room on a phone */}
                    <article data-card className="relative flex flex-col overflow-hidden rounded-[28px] bg-pen-wash lg:row-span-2">
                        <div className="p-8 pb-0 sm:p-10 sm:pb-0">
                            <h3 className="text-2xl font-bold">{l("للطالب: يمتحن من موبايله", "For students: answer from a phone")}</h3>
                            <p className="mt-2 leading-relaxed text-ink-2">{l("من بيته ومن غير رهبة اللجنة، ويشوف درجته وتفاصيلها أول ما المحاضر ينشرها.", "From home, without the panel nerves, and they see the grade and its breakdown once it's published.")}</p>
                        </div>
                        <div className="mt-8 flex flex-1 items-end justify-center overflow-hidden px-8">
                            <div data-shot className="w-[min(250px,80%)] rounded-t-[2.4rem] bg-[#0B1120] p-2 pb-0 shadow-float">
                                <img src="/screens/exam-mobile.webp" alt={l("أوضة الامتحان على الموبايل", "The exam room on a phone")} width={780} height={1688} loading="lazy" className="block w-full rounded-t-[2rem]" />
                            </div>
                        </div>
                    </article>

                    {/* Identity */}
                    <article data-card className="rounded-[28px] bg-sun-wash p-8 sm:p-10">
                        <h3 className="text-2xl font-bold">{l("الوش والصوت لازم يطابقوا", "Face and voice must match")}</h3>
                        <p className="mt-2 leading-relaxed text-ink-2">{l("بيتسجلوا مرة واحدة ويتقارنوا في كل امتحان، والكاميرا بترصد الموبايل والكتاب والنظر بعيد لفترة طويلة.", "Registered once, checked every exam; the camera notices phones, books and long looks away.")}</p>
                        <ul className="mt-6 space-y-3 rounded-2xl bg-sheet p-4">
                            <li className="flex items-center gap-3"><ScanFace className="size-5 shrink-0 text-pass" aria-hidden /><div className="flex-1"><Bar label={l("الوجه", "Face")} value={96} tone="bg-pass" /></div></li>
                            <li className="flex items-center gap-3"><Mic className="size-5 shrink-0 text-pass" aria-hidden /><div className="flex-1"><Bar label={l("الصوت", "Voice")} value={91} tone="bg-pass" /></div></li>
                        </ul>
                    </article>

                    {/* Grading */}
                    <article data-card className="rounded-[28px] border border-rule bg-paper p-8 sm:p-10">
                        <h3 className="text-2xl font-bold">{l("الدرجة بالمعنى، ومعاها السبب", "Graded by meaning, with reasons")}</h3>
                        <p className="mt-2 leading-relaxed text-ink-2">{l("لو قال المعنى صح بأسلوبه بياخد حقه. ولو المحتوى أقل من 50% مايقدرش ينجح مهما كانت طلاقته.", "The right idea in their own words earns the marks; under 50% content can't pass, however fluent.")}</p>
                        <ul className="mt-6 space-y-3 rounded-2xl bg-sheet p-4">
                            <li><Bar label={l("المحتوى (80% من الدرجة)", "Content (80% of grade)")} value={94} /></li>
                            <li><Bar label={l("الطلاقة (10%)", "Fluency (10%)")} value={86} /></li>
                            <li><Bar label={l("النزاهة (10%)", "Integrity (10%)")} value={100} /></li>
                        </ul>
                    </article>
                </div>

                {/* How it works */}
                <div data-steps className="mt-24">
                    <h3 className="text-center text-[clamp(1.6rem,3vw,2.25rem)] font-bold">{l("من السؤال للدرجة في أربع خطوات", "From question to grade in four steps")}</h3>
                    <div className="relative mt-12">
                        <div className="absolute inset-x-[12%] top-6 hidden h-0.5 overflow-hidden rounded-full bg-rule lg:block" aria-hidden>
                            <div data-steps-line className="h-full origin-[100%] bg-pen ltr:origin-[0%]" />
                        </div>
                        <ol className="relative grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((s, i) => (
                                <li key={s.title} data-step className="flex flex-col items-center">
                                    <span className="bg-sheet px-3"><StepNumber n={i + 1} /></span>
                                    <h4 className="mt-4 text-lg font-semibold">{s.title}</h4>
                                    <p className="mt-1.5 max-w-60 leading-relaxed text-ink-2">{s.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}
