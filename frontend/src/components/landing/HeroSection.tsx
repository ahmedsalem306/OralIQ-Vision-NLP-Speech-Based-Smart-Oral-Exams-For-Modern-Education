import { useRef } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useI18n } from "../../i18n";
import { ScoreMark } from "../ui/score-mark";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

const TATWEEL = "ـ";

/**
 * 1. Hero: a black stage, a heavy three-line headline, and a student at his laptop.
 * The tatweel in "أونلايـــن" stretches as the page loads and keeps stretching while
 * you scroll, the way a spoken word is drawn out.
 */
export function HeroSection({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLElement>(null);
    const kashida = useRef<HTMLSpanElement>(null);
    const ar = lang === "ar";

    useGSAP(() => {
        const setStretch = (n: number) => { if (kashida.current) kashida.current.textContent = TATWEEL.repeat(Math.round(n)); };
        withMotion(() => {
            const k = { n: 0 };
            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
            tl.from("[data-line]", { yPercent: 110, duration: 1.1, stagger: 0.12 })
                .from("[data-fade]", { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, "-=0.6")
                .from("[data-figure]", { y: 80, opacity: 0, duration: 1.2 }, 0.2)
                .from("[data-card]", { y: 30, opacity: 0, scale: 0.94, duration: 0.8 }, 0.9)
                .to(k, { n: 4, duration: 1, ease: "power2.inOut", onUpdate: () => setStretch(k.n) }, 0.7);

            // Scroll: the word keeps stretching, the figure drifts up, the card the other way
            gsap.to(k, {
                n: 11, ease: "none", onUpdate: () => setStretch(k.n),
                scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
            });
            gsap.to("[data-figure]", { yPercent: -8, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
            gsap.to("[data-card]", { yPercent: 40, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
        }, () => setStretch(4));
    }, { scope: root, dependencies: [lang] });

    return (
        <section ref={root} className="relative overflow-hidden bg-black text-white">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:min-h-[min(calc(100dvh-4.25rem),880px)] lg:grid-cols-[1.08fr_1fr]">
                <div className="relative z-10 flex flex-col justify-center pb-6 pt-14 lg:py-24">
                    <h1 className="font-display text-[clamp(2.9rem,5.4vw,5.4rem)] font-black leading-[1.08] text-white lg:whitespace-nowrap">
                        <span className="block overflow-hidden pb-[0.06em]"><span data-line className="block">{l("أول منصة عربية", "The first Arabic")}</span></span>
                        <span className="block overflow-hidden pb-[0.06em]"><span data-line className="block">{l("للامتحانات الشفوية", "platform for oral exams,")}</span></span>
                        <span className="block overflow-hidden pb-[0.1em]">
                            <span data-line className="block">
                                {ar ? <>أونلاي<span ref={kashida} aria-hidden>{TATWEEL.repeat(4)}</span>ن.</> : "online."}
                            </span>
                        </span>
                    </h1>
                    <p data-fade className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">
                        {l("الطالب يجاوب بصوته من أي مكان، والإجابة بتتصحح لوحدها وتوصل للمحاضر جاهزة، بالمعنى مش بالحفظ.",
                            "Students answer out loud from anywhere; every answer grades itself by meaning, not memorisation, and reaches the lecturer ready.")}
                    </p>
                    <div data-fade className="mt-9 flex flex-wrap gap-3">
                        <Link to={startHref} viewTransition className="inline-flex h-12 items-center bg-white px-7 font-semibold text-black transition-colors hover:bg-white/85">
                            {l("ابدأ الآن", "Get started")}
                        </Link>
                        <a href="#video" className="inline-flex h-12 items-center gap-2 border border-white/60 px-6 font-semibold text-white transition-colors hover:bg-white hover:text-black">
                            <Play className="size-4 fill-current" aria-hidden />{l("شوف الفيديو", "Watch the video")}
                        </a>
                    </div>
                </div>

                {/* The student, and the grade his answer came back with */}
                <div className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-0">
                    <img
                        data-figure
                        src="/photos/hero-cutout-v.webp"
                        srcSet="/photos/hero-cutout-v-640.webp 640w, /photos/hero-cutout-v.webp 1100w"
                        sizes="(min-width: 1024px) 50vw, 92vw"
                        alt={l("طالب بيجاوب على امتحان شفوي من اللابتوب", "A student answering an oral exam on his laptop")}
                        width={1100} height={1077}
                        fetchPriority="high"
                        className="absolute bottom-0 start-1/2 w-[min(100%,620px)] -translate-x-1/2 rtl:translate-x-1/2 lg:start-auto lg:end-[-6%] lg:w-[118%] lg:max-w-none lg:translate-x-0 rtl:lg:translate-x-0"
                    />
                    <div data-card className="absolute end-6 top-10 hidden w-52 bg-white p-4 text-black sm:block lg:end-auto lg:start-0 lg:top-[26%]">
                        <p className="text-xs text-black/60">{l("سؤال 1 من 3", "Question 1 of 3")}</p>
                        <p className="mt-1 font-display text-lg font-extrabold leading-tight">{l("عرّف الذكاء الاصطناعي", "Define AI")}</p>
                        <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2">
                            <span className="text-xs font-semibold text-[#11784C]">{l("ممتاز", "Excellent")}</span>
                            <span className="[&_.text-ink]:text-black [&_.text-ink-2]:text-black/60"><ScoreMark score={92} size="md" animate /></span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
