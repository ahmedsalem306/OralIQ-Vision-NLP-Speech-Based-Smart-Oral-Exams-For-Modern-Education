import { cn } from "../../lib/utils";

/** Section titles: large and light, the reference's voice. */
export const H2 = "font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-light leading-[1.15] tracking-tight";

/** The white action on the black page. */
export const BTN = "inline-flex h-12 items-center gap-2.5 rounded-lg bg-home-ink px-7 font-semibold text-home-bg transition-opacity hover:opacity-85";
/** The quiet action beside it. */
export const BTN_GHOST = "inline-flex h-12 items-center gap-2.5 rounded-lg px-5 font-semibold text-home-ink transition-colors hover:bg-home-ink/10";

/** A small label over a section title, with a short rule before it. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn("flex items-center gap-3 text-sm text-home-muted", className)}>
            <span className="h-px w-8 bg-current" aria-hidden />{children}
        </p>
    );
}
