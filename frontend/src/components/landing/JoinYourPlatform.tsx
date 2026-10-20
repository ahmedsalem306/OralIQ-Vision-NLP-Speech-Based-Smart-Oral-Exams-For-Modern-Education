import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Mic } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { LogoMark } from "../Logo";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

const SLIDE_MS = 5500;

/**
 * 5. We join your platform. Four kinds of places OralIQ is added to, as a list beside one
 * large photo. The list advances on its own (a line fills under the active item) while the
 * section is on screen, pauses on hover or focus, and any item can be chosen directly.
 * A small card on the photo shows what the exam looks like inside someone else's site.
 */
export function JoinYourPlatform() {
    const { l } = useI18n();
    const reduce = useReducedMotion();
    const stage = useRef<HTMLDivElement>(null);
    const [[index, prevIndex], setPair] = useState<[number, number]>([0, 0]);
    const [held, setHeld] = useState(false);
    const inView = useInView(stage, { amount: 0.4 });
    const paused = held || !inView;

    const items = [
        { img: "/photos/graduate-800.webp", srcSet: "/photos/graduate-800.webp 800w, /photos/graduate.webp 1200w", title: l("الجامعات", "Universities"), body: l("الامتحان الشفوي جوّه بوابة الجامعة، لكل الكليات والأقسام.", "Oral exams inside the university portal, for every faculty.") },
        { img: "/photos/friends-reading.webp", srcSet: "/photos/friends-reading-480.webp 480w, /photos/friends-reading.webp 800w", title: l("المدارس", "Schools"), body: l("تقييم شفوي سهل على الطلبة، والمدرس بيتابع الدرجات من مكانه.", "Spoken assessment pupils find easy; teachers follow grades in one place.") },
        { img: "/photos/lecturer-desk.webp", srcSet: "/photos/lecturer-desk-640.webp 640w, /photos/lecturer-desk.webp 1200w", title: l("السناتر ومراكز التدريب", "Centres and training providers"), body: l("اختبارات شفوية للمجموعات الكبيرة من غير ما تسمع كل تسجيل بنفسك.", "Oral tests for large groups without listening to every recording.") },
        { img: "/photos/study-cafe.webp", srcSet: "/photos/study-cafe-800.webp 800w, /photos/study-cafe.webp 1200w", title: l("المنصات التعليمية", "Learning platforms"), body: l("ميزة امتحان شفوي جاهزة جوّه منصتك، بشكلها وتحت اسمك.", "A ready oral-exam feature inside your platform, in its look and name.") },
    ];
    const count = items.length;
    const go = useCallback((i: number) => setPair(([cur]) => [((i % count) + count) % count, cur]), [count]);

    // The chosen photo opens like a curtain over the previous one
    useGSAP(() => {
        const el = stage.current?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
        if (!el || index === prevIndex) return;
        withMotion(() => {
            gsap.fromTo(el, { clipPath: "inset(50% 50% 50% 50% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1, ease: "power4.inOut" });
            gsap.fromTo(el.querySelector("img"), { scale: 1.15 }, { scale: 1, duration: 1.5, ease: "power3.out" });
        });
    }, { scope: stage, dependencies: [index] });

    return (
        <section id="integrate" className="scroll-mt-20 bg-sheet">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
                <div className="max-w-2xl">
                    <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight tracking-tight">{l("بننضم لمنصتك", "We join your platform")}</h2>
                    <p className="mt-4 text-lg leading-relaxed text-ink-2">
                        {l("عندك منصتك الخاصة ومش عايز تستخدم منصة تانية؟ بنضيف الامتحان الشفوي كميزة جوّاها، والطالب يمتحن من غير ما يخرج منها.",
                            "Have your own platform and don't want another one? We add the oral exam as a feature inside it, and students take it without leaving.")}
                    </p>
                </div>

                <div
                    className="mt-14 grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
                    onMouseEnter={() => setHeld(true)}
                    onMouseLeave={() => setHeld(false)}
                    onFocusCapture={() => setHeld(true)}
                    onBlurCapture={() => setHeld(false)}
                >
                    {/* The list */}
                    <ol className="flex flex-col justify-center gap-2">
                        {items.map((it, i) => {
                            const active = i === index;
                            return (
                                <li key={it.title}>
                                    <button
                                        type="button"
                                        onClick={() => go(i)}
                                        aria-current={active}
                                        className={cn("w-full rounded-[20px] p-5 text-start transition-colors sm:p-6", active ? "bg-paper" : "hover:bg-paper/60")}
                                    >
                                        <span className={cn("block font-display text-xl font-bold transition-colors sm:text-2xl", active ? "text-ink" : "text-ink-3")}>{it.title}</span>
                                        <span className={cn("grid transition-[grid-template-rows,opacity] duration-500", active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                                            <span className="overflow-hidden">
                                                <span className="block pt-2 leading-relaxed text-ink-2">{it.body}</span>
                                            </span>
                                        </span>
                                        {/* Fills over SLIDE_MS; when it ends, the next item comes in */}
                                        <span className="mt-4 block h-0.5 overflow-hidden rounded-full bg-rule" aria-hidden>
                                            <span
                                                key={active ? `run-${index}` : "idle"}
                                                className="block h-full origin-[100%] rounded-full bg-pen ltr:origin-[0%]"
                                                style={active && !reduce
                                                    ? { animation: `oiq-progress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }
                                                    : { transform: `scaleX(${active ? 1 : 0})` }}
                                                onAnimationEnd={active ? () => go(index + 1) : undefined}
                                            />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                        <li className="px-5 pt-4 sm:px-6">
                            <a href="#contact" className="inline-flex items-center gap-2 font-semibold text-pen hover:underline">
                                {l("كلّمنا عن إضافته لمنصتك", "Talk to us about your platform")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                            </a>
                        </li>
                    </ol>

                    {/* The photo, with the exam card on it */}
                    <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[540px]">
                        <div ref={stage} className="absolute inset-0">
                            {items.map((it, i) => (
                                <figure
                                    key={it.img}
                                    data-slide={i}
                                    aria-hidden={i !== index}
                                    className={cn("absolute inset-0 overflow-hidden rounded-[28px]", i === index ? "z-10" : i === prevIndex ? "z-0" : "invisible")}
                                >
                                    <img src={it.img} srcSet={it.srcSet} sizes="(min-width: 1024px) 44rem, calc(100vw - 2rem)" alt="" loading="lazy" className="size-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" aria-hidden />
                                </figure>
                            ))}
                        </div>
                        <div className="absolute bottom-5 start-5 z-20 w-[min(20rem,calc(100%-2.5rem))] rounded-[20px] border border-rule/70 bg-sheet p-4 shadow-float sm:bottom-7 sm:start-7">
                            <p className="text-xs text-ink-3">{l("الامتحانات › مبادئ الذكاء الاصطناعي", "Exams › Intro to AI")}</p>
                            <p className="mt-1 font-display font-semibold leading-snug">{l("عرّف الذكاء الاصطناعي واذكر مثالين", "Define AI and give two examples")}</p>
                            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2">
                                <Mic className="size-4 shrink-0 text-pen" aria-hidden />
                                <span className="flex h-5 flex-1 items-center gap-[3px]" aria-hidden>
                                    {Array.from({ length: 22 }).map((_, i) => (
                                        <span key={i} className="w-[3px] rounded-full bg-pen/70" style={{ height: `${25 + Math.abs(Math.sin(i * 0.7) * 55 + Math.sin(i * 0.23) * 20)}%` }} />
                                    ))}
                                </span>
                            </div>
                            <p className="mt-2.5 flex items-center justify-end gap-1.5 text-[0.6875rem] text-ink-3" dir="ltr"><LogoMark size={14} />powered by OralIQ</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
