import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

/** Buttons styled for the banner's dark surface. */
export const onDark = {
    primary: "bg-white text-navy shadow-none hover:bg-white/90",
    secondary: "border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15",
};

/**
 * What the banner's light says about the user's situation:
 * calm (normal activity), attention (something needs you), done (all caught up).
 */
export type BannerMood = "calm" | "attention" | "done";

const glows: Record<BannerMood, [string, string]> = {
    calm: ["color-mix(in oklab, var(--pen) 75%, transparent)", "color-mix(in oklab, var(--violet) 55%, transparent)"],
    attention: ["rgba(241, 160, 64, 0.55)", "color-mix(in oklab, var(--pen) 55%, transparent)"],
    done: ["rgba(64, 196, 170, 0.5)", "color-mix(in oklab, var(--pen) 55%, transparent)"],
};

/** Pastel versions for the bright banner: the same moods, whispered. */
const softGlows: Record<BannerMood, [string, string]> = {
    calm: ["color-mix(in oklab, var(--pen) 20%, transparent)", "color-mix(in oklab, var(--sun) 16%, transparent)"],
    attention: ["color-mix(in oklab, var(--sun) 26%, transparent)", "color-mix(in oklab, var(--pen) 14%, transparent)"],
    done: ["color-mix(in oklab, var(--teal) 22%, transparent)", "color-mix(in oklab, var(--sun) 14%, transparent)"],
};

interface WelcomeBannerProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    /** Optional visual on the end side (desktop). */
    aside?: React.ReactNode;
    mood?: BannerMood;
    /** navy: a confident dashboard header. bright: a light, friendly welcome (students). */
    variant?: "navy" | "bright";
    className?: string;
}

/**
 * Greeting at the top of the overview: navy with slowly turning light whose colour
 * follows the user's state, a faint voice waveform, and one clear next step.
 */
export function WelcomeBanner({ title, description, actions, aside, mood = "calm", variant = "navy", className }: WelcomeBannerProps) {
    const bright = variant === "bright";
    const [a, b] = (bright ? softGlows : glows)[mood];
    return (
        <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            data-mood={mood}
            className={cn(
                "relative isolate mb-8 overflow-hidden rounded-[24px] px-6 py-8 sm:px-10 sm:py-10",
                bright ? "border border-rule bg-sheet text-ink shadow-card" : "oiq-noise bg-navy text-white shadow-float",
                className,
            )}
        >
            {/* Ambient light: a large gradient field turning very slowly (GPU transform only) */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
                <div
                    className="absolute -inset-[60%] transition-[background] duration-1000 motion-safe:animate-[oiq-glow-spin_40s_linear_infinite]"
                    style={{ background: `radial-gradient(30% 35% at 70% 30%, ${a}, transparent 70%), radial-gradient(28% 32% at 30% 70%, ${b}, transparent 70%)` }}
                />
            </div>

            {/* Decorative waveform */}
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 w-full", bright ? "text-pen/[0.06]" : "text-white/[0.07]")} aria-hidden>
                {Array.from({ length: 75 }).map((_, i) => {
                    const h = 12 + Math.abs(Math.sin(i * 0.55) * 46 + Math.sin(i * 0.21) * 34);
                    return <rect key={i} x={i * 8} y={120 - h} width="4" height={h} rx="2" fill="currentColor" />;
                })}
            </svg>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                    <h1 className={cn("text-[1.875rem] font-bold leading-tight tracking-tight sm:text-[2.375rem]", bright ? "text-ink" : "text-white")}>{title}</h1>
                    {description && <p className={cn("mt-3 text-[1.0625rem] leading-relaxed", bright ? "text-ink-2" : "text-white/75")}>{description}</p>}
                    {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
                </div>
                {aside && (
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                        className="relative hidden shrink-0 lg:block"
                    >
                        {aside}
                    </motion.div>
                )}
            </div>
        </motion.section>
    );
}
