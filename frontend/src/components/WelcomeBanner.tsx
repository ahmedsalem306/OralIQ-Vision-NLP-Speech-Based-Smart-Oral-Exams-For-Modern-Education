import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

/** Buttons styled for the banner's black surface. */
export const onDark = {
    primary: "bg-white text-black hover:bg-white/85",
    secondary: "border-white text-white bg-transparent hover:bg-white hover:text-black",
};

/**
 * The user's situation, said in one line at the top of the banner:
 * calm (normal activity), attention (something needs you), done (all caught up).
 */
export type BannerMood = "calm" | "attention" | "done";

const moodLine: Record<BannerMood, string> = {
    calm: "bg-white/40",
    attention: "bg-[#F1B45A]",
    done: "bg-[#52CC8F]",
};

interface WelcomeBannerProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    /** Optional visual on the end side (desktop). */
    aside?: React.ReactNode;
    mood?: BannerMood;
    /** navy: a black band (lecturers). bright: a white sheet with a rule (students). */
    variant?: "navy" | "bright";
    className?: string;
}

/**
 * Greeting at the top of the overview: a flat band with one large heading, one line of
 * context and one next step. A thin line across the top carries the user's state.
 */
export function WelcomeBanner({ title, description, actions, aside, mood = "calm", variant = "navy", className }: WelcomeBannerProps) {
    const bright = variant === "bright";
    return (
        <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            data-mood={mood}
            className={cn(
                "relative mb-8 overflow-hidden px-6 py-9 sm:px-10 sm:py-11",
                bright ? "border border-rule bg-sheet text-ink" : "bg-black text-white",
                className,
            )}
        >
            <span
                aria-hidden
                className={cn("absolute inset-x-0 top-0 h-1", bright ? (mood === "calm" ? "bg-ink" : mood === "attention" ? "bg-warn" : "bg-pass") : moodLine[mood])}
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                    <h1 className={cn("text-[2.25rem] font-extrabold leading-[1.1] sm:text-[3rem]", bright ? "text-ink" : "text-white")}>{title}</h1>
                    {description && <p className={cn("mt-3 text-[1.0625rem] leading-relaxed", bright ? "text-ink-2" : "text-white/75")}>{description}</p>}
                    {actions && <div className="mt-7 flex flex-wrap gap-2">{actions}</div>}
                </div>
                {aside && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="relative hidden shrink-0 lg:block"
                    >
                        {aside}
                    </motion.div>
                )}
            </div>
        </motion.section>
    );
}
