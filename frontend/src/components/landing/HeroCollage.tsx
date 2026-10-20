import { useRef } from "react";
import { Link } from "react-router-dom";
import { Mic, Play, ScanFace, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { ScoreMark } from "../ui/score-mark";
import { DrawnCheck } from "../motion";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/* ── The pieces that float around the headline ─────────────────────────── */

function Photo({ src, alt = "", className, priority = false }: { src: string; alt?: string; className?: string; priority?: boolean }) {
    return <img src={src} alt={alt} loading="eager" fetchPriority={priority ? "high" : undefined} className={cn("block size-full rounded-[22px] object-cover shadow-float ring-4 ring-sheet", className)} />;
}

function GradeCard() {
    const { l } = useI18n();
    return (
        <div className="rounded-[20px] border border-rule/70 bg-sheet p-4 shadow-float">
            <p className="text-xs text-ink-3">{l("سؤال 1 من 3", "Question 1 of 3")}</p>
            <p className="mt-1 font-display font-semibold leading-snug">{l("عرّف الذكاء الاصطناعي", "Define artificial intelligence")}</p>
            <div className="mt-2 flex items-center justify-between border-t border-rule pt-2">
                <span className="rounded-md bg-pass-wash px-2 py-0.5 text-xs font-semibold text-pass">{l("ممتاز", "Excellent")}</span>
                <ScoreMark score={92} size="md" animate />
            </div>
        </div>
    );
}

function IdentityCard() {
    const { l } = useI18n();
    return (
        <div className="rounded-[20px] border border-rule/70 bg-sheet p-4 shadow-float">
            <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-full bg-pass-wash text-pass"><ShieldCheck className="size-4" aria-hidden /></span>
                {l("الهوية متأكدة", "Identity confirmed")}
            </p>
            <ul className="mt-3 space-y-2 text-xs text-ink-2">
                {([[ScanFace, l("الوجه", "Face"), 96], [Mic, l("الصوت", "Voice"), 91]] as const).map(([Icon, k, v]) => (
                    <li key={k}>
                        <span className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><Icon className="size-3.5 text-ink-3" aria-hidden />{k}</span>
                            <span className="font-semibold text-pass tabular" dir="ltr">{v}%</span>
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-rule"><span className="block h-full rounded-full bg-pass" style={{ width: `${v}%` }} /></span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function RecordingPill() {
    return (
        <div className="flex items-center gap-2.5 rounded-full border border-rule/70 bg-sheet py-2 pe-4 ps-2.5 shadow-float" dir="ltr">
            <span className="relative flex size-2.5"><span className="absolute inset-0 rounded-full bg-mark motion-safe:animate-[oiq-pulse-ring_1.4s_ease-out_infinite]" /><span className="relative size-2.5 rounded-full bg-mark" /></span>
            <span className="flex h-4 items-center gap-[3px]" aria-hidden>
                {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="h-full w-[3px] origin-center rounded-full bg-pen motion-safe:animate-[oiq-eq_1s_ease-in-out_infinite]" style={{ animationDelay: `${i * -0.12}s` }} />
                ))}
            </span>
            <span className="text-sm font-semibold tabular text-ink">01:12</span>
        </div>
    );
}

function PublishedToast() {
    const { l } = useI18n();
    return (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rule/70 bg-sheet py-2.5 pe-4 ps-3 shadow-float">
            <DrawnCheck className="size-9 shrink-0 text-pen" delay={1.4} />
            <span className="leading-tight">
                <span className="block text-sm font-semibold">{l("درجتك اتنشرت", "Your grade is out")}</span>
                <span className="mt-0.5 block text-xs text-ink-3">{l("من د. سلمى", "From Dr. Salma")}</span>
            </span>
        </div>
    );
}

/**
 * Floating pieces, desktop only. Positions are physical (left/right) because the collage
 * is a picture, not text: it reads the same in both languages.
 * `speed` sets how far a piece drifts while the hero scrolls away (nearer = faster).
 */
const PIECES: { key: string; pos: string; speed: number; rot: string; float: string; node: (l: (a: string, b: string) => string) => React.ReactNode }[] = [
    { key: "friends", pos: "left-[3%] top-[11%] w-[11.5rem] aspect-[4/5]", speed: 1.25, rot: "-rotate-6", float: "0s", node: () => <Photo src="/photos/friends-reading-480.webp" /> },
    { key: "smile", pos: "left-[25%] top-[6%] size-[4.5rem]", speed: 0.55, rot: "rotate-3", float: "-2s", node: () => <Photo src="/photos/chip-smile.webp" className="rounded-full" /> },
    { key: "grade", pos: "right-[4%] top-[9%] w-[15rem]", speed: 0.85, rot: "rotate-3", float: "-1s", node: () => <GradeCard /> },
    { key: "relaxed", pos: "right-[2.5%] top-[45%] w-[12.5rem] aspect-[4/5]", speed: 1.55, rot: "rotate-[5deg]", float: "-3s", node: () => <Photo src="/photos/student-relaxed-480.webp" /> },
    { key: "identity", pos: "left-[5%] top-[52%] w-[14rem]", speed: 1.05, rot: "-rotate-2", float: "-1.5s", node: () => <IdentityCard /> },
    { key: "lecturer", pos: "left-[19%] bottom-[4%] w-[14rem] aspect-[16/11]", speed: 1.85, rot: "rotate-2", float: "-2.5s", node: () => <Photo src="/photos/lecturer-desk-640.webp" /> },
    { key: "rec", pos: "right-[21%] bottom-[10%]", speed: 1.3, rot: "-rotate-2", float: "-0.5s", node: () => <RecordingPill /> },
    { key: "toast", pos: "right-[19%] top-[4%]", speed: 0.7, rot: "rotate-1", float: "-3.5s", node: () => <PublishedToast /> },
];

/**
 * 1. Hero. The headline sits alone in the middle of a light stage; around it, students and
 * small pieces of the product. On load the pieces come out from behind the headline; on
 * scroll each drifts at its own speed, so the stage has depth without moving the text.
 */
export function HeroCollage({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLElement>(null);

    useGSAP(() => {
        withMotion(() => {
            // fromTo with the resting values spelled out: on the pre-rendered home page these start
            // hidden by CSS (scripts/prerender.mjs), so GSAP must not read them as the end state
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.fromTo("[data-hero-line]", { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12 })
                .fromTo("[data-hero-fade]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08 }, "-=0.55");

            const box = root.current?.getBoundingClientRect();
            gsap.utils.toArray<HTMLElement>("[data-piece]").forEach((el, i) => {
                const enter = el.querySelector<HTMLElement>("[data-piece-enter]");
                if (box && enter) {
                    const r = el.getBoundingClientRect();
                    const dx = box.left + box.width / 2 - (r.left + r.width / 2);
                    const dy = box.top + box.height * 0.45 - (r.top + r.height / 2);
                    gsap.fromTo(enter, { x: dx * 0.6, y: dy * 0.6, scale: 0.55, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.4, delay: 0.3 + i * 0.06, ease: "expo.out" });
                }
                gsap.to(el, {
                    y: -150 * Number(el.dataset.speed || 1), ease: "none",
                    scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
                });
            });
            gsap.to("[data-hero-copy]", { y: 70, opacity: 0.35, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
        });
        // The entrance now holds the hidden starting state, so the pre-render's CSS hold can go
        delete document.documentElement.dataset.prerender;
    }, { scope: root, dependencies: [lang] });

    return (
        <section ref={root} className="relative isolate overflow-hidden lg:min-h-[min(calc(100dvh-4.25rem),900px)]">
            {/* Soft light and a faint dot grid */}
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
                {/* Glows sit at fixed offsets, not % of the section, so a late web font changing the section height does not move them */}
                <div className="absolute left-1/2 top-[-170px] size-[900px] -translate-x-1/2 rounded-full bg-sun/[0.10] blur-[120px]" />
                <div className="absolute right-[-10%] top-[250px] size-[520px] rounded-full bg-pen/[0.10] blur-[120px]" />
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage: "radial-gradient(var(--rule-strong) 1px, transparent 1.2px)",
                        backgroundSize: "28px 28px",
                        maskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 10%, transparent 75%)",
                        WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 10%, transparent 75%)",
                    }}
                />
            </div>

            {/* Floating pieces (desktop) */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
                {PIECES.map((p) => (
                    <div key={p.key} data-piece data-speed={p.speed} className={cn("absolute", p.pos)}>
                        <div data-piece-enter className="size-full">
                            <div className="size-full motion-safe:animate-[oiq-float_7s_ease-in-out_infinite]" style={{ animationDelay: p.float }}>
                                <div className={cn("size-full", p.rot)}>{p.node(l)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* The words */}
            <div data-hero-copy className="relative mx-auto flex max-w-[60rem] flex-col items-center px-4 pb-10 pt-16 text-center sm:px-6 lg:min-h-[inherit] lg:justify-center lg:pb-24 lg:pt-20">
                <h1 className="font-display text-[clamp(2.3rem,4.6vw,4.2rem)] font-bold leading-[1.18] tracking-tight lg:[&>span]:whitespace-nowrap">
                    <span data-hero-line className="block">{l("أول منصة عربية", "The first Arabic platform")}</span>
                    <span data-hero-line className="block">{l("للامتحانات الشفوية أونلاين.", "for online oral exams.")}</span>
                </h1>
                <p data-hero-fade className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
                    {l("الطالب يجاوب بصوته من أي مكان، والإجابة بتتصحح لوحدها بالمعنى مش بالحفظ، وتوصل للمحاضر جاهزة.",
                        "Students answer out loud from anywhere. Every answer is graded by meaning, not memorisation, and reaches the lecturer ready.")}
                </p>
                <div data-hero-fade className="mt-9 flex flex-wrap justify-center gap-3">
                    <Link to={startHref} viewTransition className="inline-flex h-[3.25rem] items-center rounded-full bg-pen px-8 text-[1.0625rem] font-semibold text-pen-ink shadow-[0_12px_28px_-12px_var(--pen)] transition-colors hover:bg-pen-hover">
                        {l("ابدأ الآن", "Get started")}
                    </Link>
                    <a href="#video" className="inline-flex h-[3.25rem] items-center gap-2 rounded-full border border-rule-strong bg-sheet px-7 text-[1.0625rem] font-semibold text-ink transition-colors hover:border-ink-3">
                        <Play className="size-4 fill-current" aria-hidden />{l("شوف الفيديو", "Watch the video")}
                    </a>
                </div>
            </div>

            {/* Phones and tablets: a small still collage under the words */}
            <div className="relative mx-auto mb-14 h-64 max-w-sm px-4 lg:hidden" aria-hidden>
                <div className="absolute start-4 top-2 h-52 w-40 -rotate-6"><Photo src="/photos/friends-reading-480.webp" priority /></div>
                <div className="absolute end-4 top-8 h-52 w-40 rotate-[5deg]"><Photo src="/photos/student-relaxed-480.webp" priority /></div>
                <div className="absolute bottom-0 left-1/2 w-56 -translate-x-1/2"><GradeCard /></div>
            </div>
        </section>
    );
}
