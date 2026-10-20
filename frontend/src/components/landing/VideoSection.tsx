import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/** Replace these two files to swap in a new walkthrough; nothing else needs to change. */
const VIDEO = { src: "/media/oraliq-demo.mp4", poster: "/media/oraliq-demo-poster.webp" };

/**
 * 3. Explainer video. The player grows to full width as it scrolls into view;
 * nothing loads until the visitor presses play.
 */
export function VideoSection() {
    const { l } = useI18n();
    const root = useRef<HTMLElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo("[data-player]", { scale: 0.86 }, {
                scale: 1, ease: "none",
                scrollTrigger: { trigger: "[data-player]", start: "top bottom", end: "center center", scrub: true },
            });
            gsap.from("[data-video-head] > *", {
                y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
                scrollTrigger: { trigger: root.current, start: "top 75%" },
            });
        });
    }, { scope: root });

    const play = () => {
        setPlaying(true);
        requestAnimationFrame(() => video.current?.play().catch(() => {}));
    };

    return (
        <section ref={root} id="video" className="scroll-mt-16 bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
                <div data-video-head className="flex flex-wrap items-end justify-between gap-6">
                    <h2 className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-black text-white">{l("شوف المنصة وهي شغالة", "See it working")}</h2>
                    <p className="max-w-md text-white/70">
                        {l("المحاضر بيكتب السؤال، الطالب بيجاوب بصوته، والدرجة بتوصل ومعاها تفاصيلها.",
                            "The lecturer writes a question, the student answers out loud, and the grade arrives with its breakdown.")}
                    </p>
                </div>

                <div data-player className="relative mt-12 aspect-video origin-center overflow-hidden border border-white/15 bg-[#111]">
                    {playing ? (
                        <video
                            ref={video}
                            src={VIDEO.src}
                            poster={VIDEO.poster}
                            controls
                            playsInline
                            preload="auto"
                            className="size-full bg-black object-contain"
                        />
                    ) : (
                        <button type="button" onClick={play} className="group absolute inset-0 size-full" aria-label={l("تشغيل الفيديو التوضيحي", "Play the walkthrough video")}>
                            <img src={VIDEO.poster} alt="" loading="lazy" className="size-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex size-20 items-center justify-center bg-white text-black transition-transform duration-300 group-hover:scale-110 sm:size-24">
                                    <Play className="size-8 fill-current" aria-hidden />
                                </span>
                            </span>
                            <span className="absolute bottom-0 start-0 bg-black px-4 py-2 text-sm font-semibold text-white">{l("دقيقة واحدة", "One minute")}</span>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
