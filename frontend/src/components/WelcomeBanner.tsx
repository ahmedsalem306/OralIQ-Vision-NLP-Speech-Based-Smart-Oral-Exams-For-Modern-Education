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

interface WelcomeBannerProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    /** Optional visual on the end side (desktop). */
    aside?: React.ReactNode;
    mood?: BannerMood;
    className?: string;
}

/**
 * Greeting at the top of the overview: navy with slowly turning light whose colour
 * follows the user's state, a faint voice waveform, and one clear next step.
 */
export function WelcomeBanner({ title, description, actions, aside, mood = "calm", className }: WelcomeBannerProps) {
    const [a, b] = glows[mood];
    return (
        <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            data-mood={mood}
            className={cn(
                "oiq-noise relative mb-8 overflow-hidden rounded-[24px] bg-navy px-6 py-8 text-white shadow-float sm:px-10 sm:py-10",
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
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-white/[0.07]" aria-hidden>
                {Array.from({ length: 75 }).map((_, i) => {
                    const h = 12 + Math.abs(Math.sin(i * 0.55) * 46 + Math.sin(i * 0.21) * 34);
                    return <rect key={i} x={i * 8} y={120 - h} width="4" height={h} rx="2" fill="currentColor" />;
                })}
            </svg>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                    <h1 className="text-[1.875rem] font-bold leading-tight tracking-tight text-white sm:text-[2.375rem]">{title}</h1>
                    {description && <p className="mt-3 text-[1.0625rem] leading-relaxed text-white/75">{description}</p>}
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
