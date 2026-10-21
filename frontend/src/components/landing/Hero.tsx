import { useRef } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/** Hero photos, graded to match the set (public/photos/CREDITS.md). */
const PHOTOS = {
    student: { base: "/photos/hero-student", width: 1600, height: 1507, position: "50% 22%" },
    cafe: { base: "/photos/hero-cafe", width: 1600, height: 1404, position: "50% 50%" },
};

// Preview only: /?cafe on the dev server shows the second photo for comparison
function pickPhoto() {
    if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("cafe")) return PHOTOS.cafe;
    return PHOTOS.student;
}

/**
 * 1. Hero. One photo of a student at a laptop, the headline and the two actions. On wide
 * screens the photo fills the end side of the stage and fades into the paper under the words;
 * on phones it sits on top and fades into them from below.
 */
export function Hero({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLElement>(null);
    const photo = pickPhoto();
    const srcSet = [640, 960, 1280, 1600].map((w) => `${photo.base}-${w}.webp ${w}w`).join(", ");

    useGSAP(() => {
        withMotion(() => {
            // fromTo with the resting values spelled out: on the pre-rendered home page these start
            // hidden by CSS (scripts/prerender.mjs), so GSAP must not read them as the end state
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.fromTo("[data-hero-line]", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12 })
                .fromTo("[data-hero-fade]", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08 }, "-=0.55");
        });
        // The entrance now holds the hidden starting state, so the pre-render's CSS hold can go
        delete document.documentElement.dataset.prerender;
    }, { scope: root, dependencies: [lang] });

    return (
        <section ref={root} className="relative isolate overflow-hidden">
            {/* The photo: the end side of the stage from 1024px, the top of it below that.
                Mirrored in English so the student still faces the words. */}
            <div className="relative h-[min(72vw,24rem)] sm:h-[28rem] lg:absolute lg:inset-y-0 lg:end-0 lg:h-auto lg:w-[60%]">
                <img
                    src={`${photo.base}-1280.webp`}
                    srcSet={srcSet}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    width={photo.width}
                    height={photo.height}
                    alt=""
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="size-full object-cover ltr:-scale-x-100"
                    style={{ objectPosition: photo.position }}
                />
                {/* Fade into the paper: from below on phones, from the words' side on wide screens */}
                <div className="absolute inset-0 bg-gradient-to-t from-paper from-5% via-paper/20 via-35% to-transparent to-60% lg:hidden" aria-hidden />
                <div className="absolute inset-0 hidden from-paper from-0% via-paper/55 via-20% to-transparent to-55% lg:block rtl:bg-gradient-to-l ltr:bg-gradient-to-r" aria-hidden />
            </div>

            <div className="relative mx-auto flex max-w-7xl px-4 sm:px-6 lg:min-h-[clamp(36rem,calc(100dvh-4.25rem),46rem)] lg:items-center">
                <div className="-mt-12 max-w-xl pb-16 sm:-mt-16 lg:mt-0 lg:max-w-[35rem] lg:py-20">
                    <h1 className="font-display text-[clamp(2.4rem,4.2vw,3.9rem)] font-bold leading-[1.15] tracking-tight">
                        <span data-hero-line className="block">{l("أول منصة عربية", "The first Arabic platform")}</span>
                        <span data-hero-line className="block">{l("للامتحانات الشفوية أونلاين.", "for online oral exams.")}</span>
                    </h1>
                    <p data-hero-fade className="mt-6 max-w-lg text-lg leading-[1.8] text-ink-2 sm:text-xl sm:leading-[1.8]">
                        {l("امتحن طلابك شفوي في نفس الوقت، من غير لجان ولا طوابير. الطالب بيجاوب بصوته من مكانه، وانت بتستلم كل إجابة مصححة ومعاها السبب.",
                            "Examine your whole class out loud at once, with no panels and no queues. Students answer from wherever they are, and every answer reaches you graded, with the reasons.")}
                    </p>
                    <div data-hero-fade className="mt-9 flex flex-wrap gap-3">
                        <Link to={startHref} viewTransition className="inline-flex h-[3.25rem] items-center rounded-full bg-pen px-8 text-[1.0625rem] font-semibold text-pen-ink shadow-[0_12px_28px_-12px_var(--pen)] transition-colors hover:bg-pen-hover">
                            {l("ابدأ الآن", "Get started")}
                        </Link>
                        <a href="#video" className="inline-flex h-[3.25rem] items-center gap-2 rounded-full border border-rule-strong bg-sheet px-7 text-[1.0625rem] font-semibold text-ink transition-colors hover:border-ink-3">
                            <Play className="size-4 fill-current" aria-hidden />{l("شوف الفيديو", "Watch the video")}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
