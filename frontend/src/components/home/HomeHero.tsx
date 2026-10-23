import { useRef } from "react";
import { Link } from "react-router-dom";
import { Play, ScanFace } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { FaceScan } from "./FaceScan";
import { BTN, BTN_GHOST } from "./ui";

/**
 * 1. Hero, on surface A. The headline, the two actions, and a portrait carrying the face mesh the
 * exam tracks. Its foot steps down into the black of the section below, as in the owner's
 * reference, so the two surfaces interlock instead of meeting on a flat line.
 */
export function HomeHero({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLElement>(null);

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
        <section ref={root} className="home-a relative isolate overflow-hidden lg:flex lg:min-h-[min(50vw,48rem)]">
            {/* Phones read it as words, face, then the detail. Wide screens give the face the whole end
                side: large, standing on the foot of the stage and running off the edge of the page. */}
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-6 gap-y-8 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[1fr_auto] lg:pt-14">
                <div className="relative z-10 lg:col-start-1 lg:row-start-1 lg:self-end">
                    <p data-hero-fade className="flex items-center gap-3 text-sm text-home-muted">
                        <span className="h-px w-8 bg-current" aria-hidden />{l("امتحانات شفوية بالذكاء الاصطناعي", "AI oral exams")}
                    </p>
                    <h1 className="mt-6 font-display text-[clamp(2.6rem,5.2vw,4.75rem)] font-light leading-[1.15] tracking-tight">
                        <span data-hero-line className="block">{l("أول منصة عربية", "The first Arabic platform")}</span>
                        <span data-hero-line className="block">{l("للامتحانات الشفوية أونلاين.", "for online oral exams.")}</span>
                    </h1>
                    <div data-hero-fade className="mt-9 flex flex-wrap items-center gap-2">
                        <Link to={startHref} viewTransition className={BTN}>{l("ابدأ الآن", "Get started")}</Link>
                        <a href="#video" className={BTN_GHOST}>
                            <Play className="size-4 fill-current" aria-hidden />{l("شوف الفيديو", "Watch the video")}
                        </a>
                    </div>
                </div>

                <div className="relative mx-auto w-full max-w-[24rem] sm:max-w-[28rem] lg:absolute lg:bottom-0 lg:end-0 lg:z-0 lg:mx-0 lg:w-[min(48vw,46rem)] lg:max-w-none">
                    <div className="home-light-only"><FaceScan tone="light" priority /></div>
                    <div className="home-dark-only"><FaceScan tone="dark" /></div>
                </div>

                <div className="relative z-10 pb-14 lg:col-start-1 lg:row-start-2 lg:pb-24">
                    <div data-hero-fade className="grid max-w-xl gap-x-8 gap-y-5 border-t border-home-line pt-7 sm:grid-cols-[auto_minmax(0,1fr)] lg:mt-4">
                        <p className="flex items-center gap-3">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-home-line"><ScanFace className="size-5" aria-hidden /></span>
                            <span className="leading-tight">
                                <span className="block font-display text-3xl font-light tabular">478</span>
                                <span className="block text-sm text-home-muted">{l("نقطة على الوش", "points on the face")}</span>
                            </span>
                        </p>
                        <p className="leading-[1.8] text-home-muted">
                            {l("امتحن طلابك شفوي في نفس الوقت، من غير لجان ولا طوابير. الطالب بيجاوب بصوته، والذكاء الاصطناعي بيتابع وشه وبيتأكد إنه هو، وانت بتستلم كل إجابة مصححة ومعاها السبب.",
                                "Examine your whole class out loud at once, with no panels and no queues. Students answer by voice while the AI follows their face to confirm it's them, and every answer reaches you graded, with the reasons.")}
                        </p>
                    </div>
                </div>
            </div>
            {/* The foot of the stage steps down into the section below */}
            <div className="absolute bottom-0 start-0 hidden h-14 w-[56%] bg-home-b-bg lg:block ltr:[clip-path:polygon(0_0,calc(100%-56px)_0,100%_100%,0_100%)] rtl:[clip-path:polygon(56px_0,100%_0,100%_100%,0_100%)]" aria-hidden />
        </section>
    );
}
