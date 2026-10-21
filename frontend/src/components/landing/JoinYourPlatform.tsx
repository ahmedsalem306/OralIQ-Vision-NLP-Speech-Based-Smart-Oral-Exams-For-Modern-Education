import { useState } from "react";
import { ArrowLeft, Mic } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { LogoMark } from "../Logo";

/**
 * 5. We join your platform. The four kinds of places OralIQ is added to are buttons; the chosen
 * one names the site in the drawing beside them, where the OralIQ exam sits inside someone
 * else's course page. Nothing moves on its own.
 */
export function JoinYourPlatform() {
    const { l } = useI18n();
    const [index, setIndex] = useState(0);

    const places = [
        { title: l("الجامعات", "Universities"), site: l("بوابة الجامعة", "University portal"), body: l("الامتحان الشفوي جوّه بوابة الجامعة، لكل الكليات والأقسام.", "The oral exam inside the university portal, for every faculty and department.") },
        { title: l("المدارس", "Schools"), site: l("منصة المدرسة", "School platform"), body: l("تقييم شفوي سهل على الطلبة، والمدرس بيتابع الدرجات من مكانه.", "Easy oral assessment for pupils, with teachers following grades from their desk.") },
        { title: l("السناتر ومراكز التدريب", "Centres and training providers"), site: l("موقع السنتر", "Training centre site"), body: l("اختبارات شفوية للمجموعات الكبيرة من غير ما تسمع كل تسجيل بنفسك.", "Oral tests for large groups without listening to every recording yourself.") },
        { title: l("المنصات التعليمية", "Learning platforms"), site: l("منصتك التعليمية", "Your learning platform"), body: l("ميزة امتحان شفوي جاهزة جوّه منصتك، بشكلها وتحت اسمك.", "A ready oral-exam feature inside your platform, in its look and under your name.") },
    ];
    const place = places[index];

    return (
        <section id="integrate" className="scroll-mt-20 bg-sheet">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-28">
                <div>
                    <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.15] tracking-tight">{l("بننضم لمنصتك، وتفضل باسمك.", "We join your platform, under your name.")}</h2>
                    <p className="mt-5 max-w-xl text-lg leading-[1.8] text-ink-2">
                        {l("مش لازم طلابك يتعلموا موقع جديد. بنضيف الامتحان الشفوي كميزة جوّه منصتك، بشكلها وتحت اسمك، والطالب يمتحن من غير ما يخرج منها.",
                            "Your students don't need to learn a new site. We add the oral exam as a feature inside your platform, in its look and under your name, and students take it without leaving.")}
                    </p>
                    <div className="mt-9 flex flex-wrap gap-2" role="group" aria-label={l("نوع المكان", "Kind of place")}>
                        {places.map((p, i) => (
                            <button
                                key={p.title}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-pressed={i === index}
                                className={cn("min-h-11 rounded-full border px-4 text-[0.9375rem] font-semibold transition-colors", i === index ? "border-ink bg-ink text-paper" : "border-rule-strong hover:border-ink-3")}
                            >
                                {p.title}
                            </button>
                        ))}
                    </div>
                    <p className="mt-5 min-h-[3.5rem] max-w-xl leading-relaxed text-ink-2" aria-live="polite">{place.body}</p>
                    <a href="#contact" className="mt-4 inline-flex min-h-10 items-center gap-2 font-semibold text-pen hover:underline">
                        {l("كلّمنا ونشوف إزاي نضيفه لمنصتك", "Talk to us about adding it to your platform")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                    </a>
                </div>

                {/* Someone else's site, drawn plainly, with the OralIQ exam inside it */}
                <figure className="relative" aria-label={l(`امتحان OralIQ جوّه ${place.site}`, `An OralIQ exam inside a ${place.site.toLowerCase()}`)}>
                    <div className="overflow-hidden rounded-[18px] border border-rule-strong bg-paper shadow-float" aria-hidden>
                        <div className="flex items-center gap-3 border-b border-rule bg-sheet px-5 py-3.5">
                            <span className="size-6 rounded-md bg-ink/80" />
                            <span className="font-display text-sm font-semibold">{place.site}</span>
                            <span className="ms-auto h-2 w-20 rounded-full bg-rule" />
                        </div>
                        <div className="grid grid-cols-[10rem_minmax(0,1fr)] max-sm:grid-cols-1">
                            <div className="hidden space-y-4 border-e border-rule p-6 sm:block">
                                {[70, 55, 80, 60, 45, 65].map((w, k) => <span key={k} className={cn("block h-2 rounded-full", k === 2 ? "bg-pen/50" : "bg-rule")} style={{ width: `${w}%` }} />)}
                            </div>
                            <div className="p-5 sm:p-8">
                                <p className="text-xs text-ink-3">{l("المقررات › مبادئ الذكاء الاصطناعي", "Courses › Intro to AI")}</p>
                                <p className="mt-2 font-display text-xl font-semibold">{l("الامتحان الشفوي", "Oral exam")}</p>
                                <p className="mt-1 text-sm text-ink-3">{l("3 أسئلة في 10 دقايق", "3 questions in 10 minutes")}</p>
                                <div className="mt-5 rounded-[14px] border border-rule bg-sheet p-4 sm:p-5">
                                    <p className="text-xs text-ink-3">{l("سؤال 1 من 3", "Question 1 of 3")}</p>
                                    <p className="mt-1 font-display font-semibold leading-snug">{l("عرّف الذكاء الاصطناعي واذكر مثالين", "Define AI and give two examples")}</p>
                                    <div className="mt-4 flex items-center gap-2 rounded-full bg-paper px-3 py-2.5">
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pen-wash text-pen"><Mic className="size-3.5" /></span>
                                        <span className="flex h-5 flex-1 items-center gap-[3px]">
                                            {Array.from({ length: 26 }).map((_, k) => <span key={k} className="w-[3px] rounded-full bg-pen/60" style={{ height: `${30 + Math.abs(Math.sin(k * 0.7) * 60)}%` }} />)}
                                        </span>
                                        <span className="ltr text-xs font-semibold tabular text-ink-2">0:42</span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <span className="inline-flex h-9 items-center rounded-full bg-pen px-4 text-sm font-semibold text-pen-ink">{l("ابدأ الإجابة", "Start answering")}</span>
                                        <span className="flex items-center gap-1.5 text-[0.6875rem] text-ink-3" dir="ltr"><LogoMark size={13} />powered by OralIQ</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </figure>
            </div>
        </section>
    );
}
