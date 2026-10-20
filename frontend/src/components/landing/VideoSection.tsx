import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/** Replace these two files to swap in a new walkthrough; nothing else needs to change. */
const VIDEO = { src: "/media/oraliq-demo.mp4", poster: "/media/oraliq-demo-poster.webp" };

/**
 * 3. Explainer video. The player grows to full size as it scrolls into view;
 * nothing downloads until the visitor presses play.
 */
export function VideoSection() {
    const { l } = useI18n();
    const root = useRef<HTMLElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo("[data-player]", { scale: 0.86, borderRadius: 48 }, {
                scale: 1, borderRadius: 28, ease: "none",
                scrollTrigger: { trigger: "[data-player]", start: "top bottom", end: "center 55%", scrub: true },
            });
        });
    }, { scope: root });

    const play = () => {
        setPlaying(true);
        requestAnimationFrame(() => video.current?.play().catch(() => {}));
    };

    return (
        <section ref={root} id="video" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-bold leading-tight tracking-tight">{l("شوف المنصة وهي شغالة", "See it working")}</h2>
                    <p className="mt-4 text-lg leading-relaxed text-ink-2">
                        {l("في دقيقة: المحاضر بيكتب السؤال، الطالب بيجاوب بصوته، والدرجة بتوصل ومعاها تفاصيلها.",
                            "In a minute: the lecturer writes a question, the student answers out loud, and the grade arrives with its breakdown.")}
                    </p>
                </div>

                <div data-player className="relative mt-14 aspect-video overflow-hidden rounded-[28px] border border-rule bg-sheet shadow-float">
                    {playing ? (
                        <video ref={video} src={VIDEO.src} poster={VIDEO.poster} controls playsInline preload="auto" className="size-full bg-sheet object-contain" />
                    ) : (
                        <button type="button" onClick={play} className="group absolute inset-0 size-full" aria-label={l("تشغيل الفيديو التوضيحي", "Play the walkthrough video")}>
                            <img src={VIDEO.poster} alt="" loading="lazy" className="size-full object-cover" />
                            <span className="absolute inset-0 bg-ink/10 transition-colors duration-300 group-hover:bg-ink/0" aria-hidden />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="relative flex size-20 items-center justify-center rounded-full bg-pen text-pen-ink shadow-[0_18px_40px_-12px_var(--pen)] transition-transform duration-300 group-hover:scale-110 sm:size-24">
                                    <span className="absolute inset-0 rounded-full bg-pen/40 motion-safe:animate-[oiq-pulse-ring_2s_ease-out_infinite]" aria-hidden />
                                    <Play className="relative size-8 fill-current" aria-hidden />
                                </span>
                            </span>
                            <span className="absolute start-4 top-4 rounded-full bg-sheet/95 px-4 py-1.5 text-sm font-semibold text-ink shadow-pop">{l("دقيقة واحدة", "One minute")}</span>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
