import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

const SLIDE_MS = 6000;

/**
 * 5. We join your platform: a black band with a full-bleed slideshow of the kinds of
 * places OralIQ is added to. Autoplays with a progress bar, pauses on hover or focus,
 * and stays still when motion is reduced.
 */
export function IntegrationCarousel() {
    const { l, lang } = useI18n();
    const reduce = useReducedMotion();
    const root = useRef<HTMLElement>(null);
    const stage = useRef<HTMLDivElement>(null);
    // [current, previous]: the previous slide stays under the new one while it wipes in
    const [[index, prevIndex], setSlides] = useState<[number, number]>([0, 0]);
    const [held, setHeld] = useState(false);
    // Autoplay only while the slideshow is on screen and not being hovered or focused
    const inView = useInView(stage, { amount: 0.4 });
    const paused = held || !inView;

    const slides = [
        { img: "wide-graduate", title: l("الجامعات", "Universities"), body: l("الامتحان الشفوي جوّه بوابة الجامعة، لكل الكليات والأقسام.", "Oral exams inside the university portal, for every faculty and department.") },
        { img: "wide-friends", title: l("المدارس", "Schools"), body: l("تقييم شفوي للطلبة بلغة سهلة، والمدرس بيتابع الدرجات من مكانه.", "Spoken assessment pupils find easy, with teachers following grades from one place.") },
        { img: "wide-lecturer", title: l("السناتر ومراكز التدريب", "Centres and training providers"), body: l("اختبارات شفوية للمجموعات الكبيرة من غير ما تسمع كل تسجيل بنفسك.", "Oral tests for large groups without listening to every recording yourself.") },
        { img: "wide-relaxed", title: l("المنصات التعليمية", "Learning platforms"), body: l("ميزة امتحان شفوي جاهزة جوّه منصتك، بشكلها وتحت اسمك.", "A ready oral-exam feature inside your platform, in its look and under your name.") },
    ];
    const count = slides.length;
    const go = useCallback((i: number) => setSlides(([cur]) => [((i % count) + count) % count, cur]), [count]);

    // Slide change: the new image wipes in from the reading side and settles
    useGSAP(() => {
        const current = stage.current?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
        if (!current) return;
        withMotion(() => {
            // Wipes in from the side you start reading on
            const from = lang === "ar" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
            gsap.fromTo(current, { clipPath: from }, { clipPath: "inset(0 0% 0 0%)", duration: 1.1, ease: "power4.inOut" });
            gsap.fromTo(current.querySelector("img"), { scale: 1.12 }, { scale: 1, duration: 1.6, ease: "power3.out" });
            gsap.fromTo(current.querySelectorAll("[data-caption] > *"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, delay: 0.4, ease: "power3.out" });
        });
    }, { scope: stage, dependencies: [index] });

    useGSAP(() => {
        withMotion(() => {
            gsap.from("[data-int-head] > *", { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 75%" } });
        });
    }, { scope: root });

    return (
        <section ref={root} id="integrate" className="scroll-mt-16 bg-black text-white" aria-roledescription="carousel" aria-label={l("بننضم لمنصتك", "We join your platform")}>
            <div data-int-head className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
                <div className="max-w-2xl">
                    <h2 className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-black text-white">{l("بننضم لمنصتك", "We join your platform")}</h2>
                    <p className="mt-4 text-lg leading-relaxed text-white/70">
                        {l("OralIQ مش لازم يبقى منصة منفصلة. ممكن يبقى ميزة جوّه منصة الجامعة أو المدرسة أو السنتر أو المنصة التعليمية بتاعتك، والطالب يمتحن من غير ما يخرج منها.",
                            "OralIQ doesn't have to be a separate platform. It can be a feature inside your university's, school's, centre's or learning platform, and students take the exam without leaving it.")}
                    </p>
                </div>
                <a href="#contact" className="inline-flex items-center gap-2 border-b border-white/40 pb-1 font-semibold text-white transition-colors hover:border-white">
                    {l("كلّمنا", "Talk to us")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                </a>
            </div>

            <div
                ref={stage}
                className="relative h-[clamp(420px,62vh,640px)] overflow-hidden"
                onMouseEnter={() => setHeld(true)}
                onMouseLeave={() => setHeld(false)}
                onFocusCapture={() => setHeld(true)}
                onBlurCapture={() => setHeld(false)}
            >
                {slides.map((s, i) => (
                    <figure
                        key={s.img}
                        data-slide={i}
                        aria-roledescription="slide"
                        aria-label={`${i + 1} / ${count}`}
                        aria-hidden={i !== index}
                        className={cn("absolute inset-0 overflow-hidden", i === index ? "z-10" : i === prevIndex ? "z-0" : "invisible")}
                    >
                        <img
                            src={`/photos/${s.img}.webp`}
                            srcSet={`/photos/${s.img}-960.webp 960w, /photos/${s.img}.webp 1920w`}
                            sizes="100vw"
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" aria-hidden />
                        <figcaption data-caption className="absolute bottom-24 start-0 max-w-xl px-4 sm:px-6 lg:start-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
                            <p className="font-display text-[clamp(2rem,3.6vw,3rem)] font-black leading-tight text-white">{s.title}</p>
                            <p className="mt-2 text-lg text-white/80">{s.body}</p>
                        </figcaption>
                    </figure>
                ))}

                {/* Controls */}
                <div className="absolute inset-x-0 bottom-0 z-20">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 pb-8 sm:px-6">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => go(index - 1)} className="flex size-11 items-center justify-center bg-white text-black transition-colors hover:bg-white/85" aria-label={l("السابق", "Previous")}>
                                <ArrowRight className="size-5 ltr:rotate-180" aria-hidden />
                            </button>
                            <button type="button" onClick={() => go(index + 1)} className="flex size-11 items-center justify-center bg-white text-black transition-colors hover:bg-white/85" aria-label={l("التالي", "Next")}>
                                <ArrowLeft className="size-5 ltr:rotate-180" aria-hidden />
                            </button>
                        </div>
                        <ol className="flex flex-1 items-center justify-end gap-2" aria-label={l("الشرائح", "Slides")}>
                            {slides.map((s, i) => (
                                <li key={s.img} className="w-10 sm:w-16">
                                    <button type="button" onClick={() => go(i)} className="block w-full py-3" aria-label={s.title} aria-current={i === index}>
                                        <span className="block h-0.5 overflow-hidden bg-white/30">
                                            {/* The active bar fills over SLIDE_MS; when it ends, the next slide comes in */}
                                            <span
                                                key={i === index ? `run-${index}` : "idle"}
                                                className="block h-full origin-[100%] bg-white ltr:origin-[0%]"
                                                style={i === index && !reduce
                                                    ? { animation: `oiq-progress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }
                                                    : { transform: `scaleX(${i < index || (i === index && reduce) ? 1 : 0})` }}
                                                onAnimationEnd={i === index ? () => go(index + 1) : undefined}
                                            />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}
