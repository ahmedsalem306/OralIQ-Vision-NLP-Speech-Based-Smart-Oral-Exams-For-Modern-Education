import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { useI18n } from "../../i18n";
import { H2 } from "./ui";

/** Replace these two files to swap in a new walkthrough; nothing else needs to change. */
const VIDEO = { src: "/media/oraliq-demo.mp4", poster: "/media/oraliq-demo-poster.webp" };

/**
 * 5. The explainer video, as one wide black-and-white card with a play button (the reference's
 * closing banner). The video opens in a dialog and downloads only then.
 */
export function HomeVideo() {
    const { l } = useI18n();
    const dialog = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const d = dialog.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    return (
        <section id="video" className="scroll-mt-20 bg-home-bg px-4 pb-24 text-home-ink sm:px-6 lg:pb-32">
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-black">
                {/* The student fills the end side; the words have the black start side to themselves.
                    On phones the photo sits on top and the words below it. */}
                <div className="relative aspect-[6/5] lg:absolute lg:inset-y-0 lg:end-0 lg:aspect-auto lg:w-[56%]">
                    <img src="/photos/video-cover-1080.webp" srcSet="/photos/video-cover-720.webp 720w, /photos/video-cover-1080.webp 1080w, /photos/video-cover-1440.webp 1440w"
                        sizes="(min-width: 1280px) 680px, (min-width: 1024px) 56vw, 100vw" width={1440} height={1200} loading="lazy" decoding="async" alt=""
                        className="size-full object-cover object-[50%_30%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 via-30% to-transparent lg:hidden" aria-hidden />
                    <div className="absolute inset-0 hidden from-black via-black/40 via-25% to-transparent to-60% lg:block rtl:bg-gradient-to-l ltr:bg-gradient-to-r" aria-hidden />
                </div>
                <div className="relative flex flex-col justify-end gap-8 p-7 sm:p-12 lg:min-h-[34rem] lg:max-w-[52%] lg:justify-center lg:p-16">
                    <h2 className={`${H2} max-w-xl text-white`}>{l("دقيقة واحدة، وتشوف كل حاجة بعينك.", "One minute, and you'll see it all.")}</h2>
                    <div className="flex items-center gap-5 sm:max-w-md">
                        <button type="button" onClick={() => setOpen(true)} aria-label={l("تشغيل الفيديو التوضيحي، دقيقة واحدة", "Play the walkthrough video, one minute")}
                            className="relative flex size-16 shrink-0 items-center justify-center rounded-full border border-white/60 text-white transition-colors hover:bg-white hover:text-black">
                            <Play className="size-6 fill-current" aria-hidden />
                        </button>
                        <p className="leading-relaxed text-white/80">{l("من كتابة السؤال، لإجابة الطالب بصوته، لحد ما الدرجة توصل جاهزة بتفاصيلها.", "From writing the question, to the student answering out loud, to the grade arriving with its breakdown.")}</p>
                    </div>
                </div>
            </div>

            <dialog
                ref={dialog}
                onCancel={(e) => { e.preventDefault(); setOpen(false); }}
                onClick={(e) => { if (e.target === dialog.current) setOpen(false); }}
                aria-label={l("الفيديو التوضيحي", "The walkthrough video")}
                className="m-auto w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-[20px] bg-black p-0 backdrop:bg-black/80"
            >
                {open && (
                    <div className="relative">
                        <video src={VIDEO.src} poster={VIDEO.poster} controls autoPlay playsInline className="aspect-video w-full bg-black" />
                        <button type="button" onClick={() => setOpen(false)} aria-label={l("إغلاق الفيديو", "Close the video")} className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">
                            <X className="size-5" aria-hidden />
                        </button>
                    </div>
                )}
            </dialog>
        </section>
    );
}
