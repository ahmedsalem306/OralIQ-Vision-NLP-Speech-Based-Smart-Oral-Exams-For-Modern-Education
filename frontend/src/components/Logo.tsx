import { cn } from "../lib/utils";

/** The mark: a voice waveform in ballpoint blue, circled in the grader's red pen. */
export function LogoMark({ size = 32, className, light = false }: { size?: number; className?: string; light?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
            <path
                d="M33.5 9.5C46 9.8 55 19 54.6 31.6 54.2 44.6 44 54.4 31.2 54.2 18.6 54 9.6 44.6 9.8 32 10 19.6 19.4 9.6 32.6 9.6c4 .1 7.8 1.2 10.8 3"
                stroke="var(--mark)" strokeWidth="3.6" strokeLinecap="round"
            />
            <g stroke={light ? "#F3F3F1" : "var(--pen)"} strokeWidth="4.4" strokeLinecap="round">
                <path d="M22 28v8" /><path d="M29 21v22" /><path d="M36 25v14" /><path d="M43 29v6" />
            </g>
        </svg>
    );
}

interface LogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
    /** For navy / photo backgrounds. */
    light?: boolean;
    /** Extra classes for the wordmark, e.g. to drop it on the narrowest screens. */
    textClassName?: string;
}

export default function Logo({ size = 32, showText = true, className, light = false, textClassName }: LogoProps) {
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-2", className)} dir="ltr">
            <LogoMark size={size} light={light} />
            {showText && (
                <span className={cn("font-display font-bold tracking-tight", light ? "text-white" : "text-ink", textClassName)} style={{ fontSize: size * 0.62 }}>
                    Oral<span className={light ? "text-white/70" : "text-ink-3"}>IQ</span>
                </span>
            )}
        </span>
    );
}
