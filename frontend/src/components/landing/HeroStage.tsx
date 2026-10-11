import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, AudioLines, Laptop, ScanFace, Smartphone, Tablet } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { EASE, Magnetic, motion } from "../motion";
import { ScoreMark } from "../ui/score-mark";

type Line = { points: string; x: number; y: number };

/**
 * Where the annotation lines land on the cut-out photo, as % of the image box.
 * Measured on the RTL (unmirrored) photo; mirrored for LTR.
 */
const ANCHORS = {
    voice: { x: 27.5, y: 41 },   // the headphone cup on the image's left
    face: { x: 52, y: 44 },      // her cheek
};

/**
 * Home hero: a sky-coloured stage with a cut-out student, two giant words around her,
 * frosted notes pinned to the photo with thin lines, and three dark tabs along the bottom.
 */
export function HeroStage({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const rtl = lang === "ar";

    const frameRef = useRef<HTMLDivElement>(null);
    const noteVoice = useRef<HTMLDivElement>(null);
    const noteFace = useRef<HTMLDivElement>(null);
    const dotVoice = useRef<HTMLSpanElement>(null);
    const dotFace = useRef<HTMLSpanElement>(null);
    const [lines, setLines] = useState<Line[]>([]);

    // Lines follow the real positions of the notes and the anchor dots, whatever the viewport
    const measure = useCallback(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const f = frame.getBoundingClientRect();
        const next: Line[] = [];
        for (const [note, dot] of [[noteVoice, dotVoice], [noteFace, dotFace]] as const) {
            if (!note.current || !dot.current) continue;
            const n = note.current.getBoundingClientRect();
            const d = dot.current.getBoundingClientRect();
            if (!n.width || !d.width) continue;
            const dx = d.left + d.width / 2 - f.left;
            const dy = d.top + d.height / 2 - f.top;
            const fromLeft = dx < n.left - f.left;
            const sx = fromLeft ? n.left - f.left : n.right - f.left;
            const sy = n.top + n.height / 2 - f.top;
            const elbow = fromLeft ? sx - 34 : sx + 34;
            next.push({ points: `${sx},${sy} ${elbow},${sy} ${dx},${dy}`, x: dx, y: dy });
        }
        setLines(next);
    }, []);

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const ro = new ResizeObserver(() => measure());
        ro.observe(frame);
        return () => ro.disconnect();
    }, [measure, lang]);

    const anchor = (a: { x: number; y: number }) => ({ left: `${rtl ? a.x : 100 - a.x}%`, top: `${a.y}%` });

    const devices = [Smartphone, Laptop, Tablet];

    return (
        <div className="px-3 pt-3 sm:px-5 sm:pt-4">
            <div
                ref={frameRef}
                className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] lg:h-[clamp(660px,calc(100dvh-6.5rem),840px)] lg:rounded-[36px]"
                style={{ background: "var(--hero-sky)" }}
            >
                {/* Soft light and a faint ring, like a stage spotlight */}
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute left-1/2 top-[8%] size-[min(70vw,760px)] -translate-x-1/2 rounded-full bg-white/25 blur-[90px]" />
                    <div className="absolute left-1/2 top-[14%] hidden size-[min(52vw,620px)] -translate-x-1/2 rounded-full border border-white/40 lg:block" />
                </div>

                {/* Giant words (desktop): the first sits behind her, the second in front, for depth.
                    The hero's staggered page-load entrance is the page's one orchestrated moment: avoid-ai-design-ignore-file: M1 */}
                <motion.p
                    aria-hidden
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: EASE, delay: 0.15 }}
                    className="pointer-events-none absolute start-[4%] top-[9%] z-0 hidden font-display text-[clamp(5rem,10.2vw,9.75rem)] font-extrabold leading-none tracking-tight drop-shadow-[0_12px_30px_rgba(30,60,130,0.18)] lg:block"
                    style={{ color: "var(--hero-word)" }}
                >
                    {l("إجابتك", "Answer")}
                </motion.p>
                <motion.p
                    aria-hidden
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: EASE, delay: 0.3 }}
                    className="pointer-events-none absolute bottom-[calc(13rem+5%)] end-[3%] z-[12] hidden font-display text-[clamp(5rem,10.2vw,9.75rem)] font-extrabold leading-none tracking-tight drop-shadow-[0_12px_30px_rgba(30,60,130,0.18)] lg:block"
                    style={{ color: "var(--hero-word)" }}
                >
                    {l("بصوتك.", "aloud.")}
                </motion.p>

                {/* Giant words (phones) */}
                <p aria-hidden className="relative z-0 px-5 pt-9 text-center font-display text-[clamp(3.4rem,17vw,5rem)] font-extrabold leading-[1.18] tracking-tight lg:hidden" style={{ color: "var(--hero-word)" }}>
                    {l("إجابتك", "Answer")}<br />{l("بصوتك.", "aloud.")}
                </p>

                {/* The student */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                    onAnimationComplete={measure}
                    className="relative z-10 mx-auto -mt-2 w-[88%] max-w-[440px] lg:absolute lg:bottom-0 lg:left-1/2 lg:mt-0 lg:h-[88%] lg:w-auto lg:max-w-none lg:-translate-x-1/2"
                >
                    <img
                        src="/photos/hero-cutout.webp"
                        srcSet="/photos/hero-cutout-640.webp 640w, /photos/hero-cutout.webp 1100w"
                        sizes="(min-width: 1024px) 720px, 88vw"
                        alt={l("طالبة مبتسمة لابسة سماعات بتجاوب على امتحان شفوي", "A smiling student wearing headphones, answering an oral exam")}
                        width={1100} height={1121}
                        fetchPriority="high"
                        onLoad={measure}
                        className={cn("block h-auto w-full lg:h-full lg:w-auto", !rtl && "-scale-x-100")}
                    />
                    {/* Anchor points for the notes */}
                    {(["voice", "face"] as const).map((k) => (
                        <span
                            key={k}
                            ref={k === "voice" ? dotVoice : dotFace}
                            className="absolute hidden size-3.5 -translate-x-1/2 -translate-y-1/2 lg:block"
                            style={anchor(ANCHORS[k])}
                            aria-hidden
                        >
                            <span className="absolute inset-0 rounded-full bg-white/70 motion-safe:animate-[oiq-pulse-ring_2s_ease-out_infinite]" />
                            <span className="absolute inset-0 rounded-full border-[3px] border-white bg-pen shadow-[0_0_0_4px_rgba(255,255,255,0.35)]" />
                        </span>
                    ))}
                </motion.div>

                {/* Annotation lines */}
                <svg className="pointer-events-none absolute inset-0 z-[15] hidden size-full lg:block" aria-hidden>
                    {lines.map((ln, i) => (
                        <motion.polyline
                            key={`${i}-${ln.points}`}
                            points={ln.points}
                            fill="none"
                            stroke="var(--hero-line)"
                            strokeWidth={1.5}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.15 }}
                        />
                    ))}
                </svg>

                {/* Frosted notes */}
                <Note
                    ref={noteVoice}
                    className="end-[5%] top-[22%]"
                    icon={<AudioLines className="size-5" aria-hidden />}
                    title={l("صوتك بيتحوّل لنص", "Your voice becomes text")}
                    body={l("ويتقارن بالمعنى مع الإجابة النموذجية", "and is compared by meaning with the model answer")}
                    delay={0.9}
                    onShown={measure}
                />
                <Note
                    ref={noteFace}
                    className="start-[5%] top-[50%]"
                    icon={<ScanFace className="size-5" aria-hidden />}
                    title={l("الكاميرا بتتأكد إنه انت", "The camera confirms it's you")}
                    body={l("الوش والصوت بيتقارنوا في كل امتحان", "face and voice are checked every exam")}
                    delay={1.05}
                    onShown={measure}
                />

                {/* Bottom tabs (on desktop the slivers between them show the sky, not the photo) */}
                <div
                    className="relative z-20 -mt-10 grid gap-3 p-3 pt-0 md:grid-cols-2 lg:mt-0 lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[13rem] lg:grid-cols-[1fr_1.35fr_1fr] lg:gap-0 lg:bg-[var(--hero-sky-end)] lg:p-0">
                    {/* Start: any device */}
                    <div className={cn("relative hidden flex-col justify-between rounded-[22px] bg-navy p-6 text-white md:order-2 md:flex lg:order-none lg:rounded-none lg:p-7", rtl ? "oiq-notch-r lg:ps-14" : "oiq-notch-l lg:pe-14")}>
                        <div className="flex items-center gap-2">
                            {devices.map((Icon, i) => (
                                <span key={i} className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white/85"><Icon className="size-[18px]" aria-hidden /></span>
                            ))}
                        </div>
                        <p className="mt-4 text-[1.0625rem] font-semibold leading-snug">{l("يجاوب من الموبايل أو اللابتوب، من غير ما يسطّب حاجة.", "Answer on a phone or laptop — nothing to install.")}</p>
                        <a href="#how" className="mt-3 inline-flex w-fit items-center gap-1.5 border-b border-white/30 pb-0.5 text-sm text-white/80 transition-colors hover:border-white hover:text-white">
                            {l("شوف إزاي بيشتغل", "See how it works")}
                            <ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden />
                        </a>
                    </div>

                    {/* Center: the promise */}
                    <div className="oiq-notch-c relative flex flex-col items-center justify-center rounded-[22px] bg-navy px-6 pb-7 pt-12 text-center text-white md:order-1 md:col-span-2 lg:order-none lg:col-span-1 lg:-mx-8 lg:rounded-none lg:px-20 lg:pb-6 lg:pt-10">
                        <h1 className="font-display text-[1.65rem] font-bold leading-snug text-white sm:text-[1.9rem]">
                            {l("أول منصة عربية للامتحانات الشفوية أونلاين.", "The first Arabic platform for online oral exams.")}
                        </h1>
                        <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-white/65">
                            {l("الطالب يجاوب بصوته من أي مكان، والإجابة بتتصحح لوحدها وتوصل للمحاضر جاهزة.", "Students answer out loud from anywhere; every answer grades itself and reaches the lecturer ready to review.")}
                        </p>
                    </div>

                    {/* End: the grade, explained */}
                    <div className={cn("relative hidden flex-col justify-between rounded-[22px] bg-navy p-6 text-white md:order-2 md:flex lg:order-none lg:rounded-none lg:p-7", rtl ? "oiq-notch-l lg:pe-14" : "oiq-notch-r lg:ps-14")}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="[&_.text-ink]:text-white [&_.text-ink-2]:text-white/60"><ScoreMark score={92} size="md" animate /></span>
                            <span className="flex -space-x-2.5 rtl:space-x-reverse" aria-hidden>
                                {["/photos/chip-smile.webp", "/photos/chip-student.webp", "/photos/chip-lecturer-desk.webp"].map((src) => (
                                    <img key={src} src={src} alt="" className="size-9 rounded-full object-cover ring-2 ring-navy" />
                                ))}
                            </span>
                        </div>
                        <p className="mt-4 text-[1.0625rem] font-semibold leading-snug">{l("كل درجة معاها السبب.", "Every grade shows its reasons.")}</p>
                        <p className="mt-1 text-sm text-white/65">{l("محتوى وطلاقة ونزاهة، والمحاضر بيراجع قبل النشر.", "Content, fluency and integrity, reviewed before it's published.")}</p>
                    </div>

                    {/* The call to action sits on the edge between the stage and the tabs */}
                    <div className="relative z-10 order-first -mb-9 flex justify-center md:col-span-2 lg:absolute lg:left-1/2 lg:top-0 lg:order-none lg:mb-0 lg:-translate-x-1/2 lg:-translate-y-1/2">
                        <Magnetic>
                            <Link
                                to={startHref}
                                viewTransition
                                className="group inline-flex items-center gap-3 rounded-full bg-white py-2 pe-2 ps-6 font-display text-[1.0625rem] font-semibold text-navy shadow-[0_18px_40px_-14px_rgba(14,24,52,0.45)] transition-transform hover:scale-[1.03] focus-visible:outline-offset-4"
                            >
                                {l("ابدأ الآن", "Get started")}
                                <span className="flex size-10 items-center justify-center rounded-full bg-[#F2762E] text-white transition-transform duration-300 group-hover:-rotate-45 rtl:group-hover:rotate-45">
                                    <ArrowUpLeft className="size-5 ltr:rotate-90" aria-hidden />
                                </span>
                            </Link>
                        </Magnetic>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface NoteProps {
    className?: string;
    icon: React.ReactNode;
    title: string;
    body: string;
    delay: number;
    onShown: () => void;
    ref: React.Ref<HTMLDivElement>;
}

/** Frosted note pinned to the photo by a line (desktop). */
function Note({ className, icon, title, body, delay, onShown, ref }: NoteProps) {
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay }}
            onAnimationComplete={onShown}
            className={cn("absolute z-20 hidden w-[15.5rem] items-center gap-3 rounded-2xl border p-3 shadow-[0_20px_40px_-22px_rgba(14,24,52,0.45)] backdrop-blur-md lg:flex", className)}
            style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}
        >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-pen">{icon}</span>
            <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--glass-ink)" }}>{title}</p>
                <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--glass-muted)" }}>{body}</p>
            </div>
        </motion.div>
    );
}
