import { cn } from "../../lib/utils";

/** Section titles: large and light, the reference's voice. */
export const H2 = "font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-light leading-[1.15] tracking-tight";

/** The filled action: it inverts with its section, so it is black on A and white on B. */
export const BTN = "inline-flex h-12 items-center gap-2.5 rounded-lg bg-home-ink px-7 font-semibold text-home-bg transition-opacity hover:opacity-85";
/** The quiet action beside it. */
export const BTN_GHOST = "inline-flex h-12 items-center gap-2.5 rounded-lg px-5 font-semibold text-home-ink transition-colors hover:bg-home-ink/10";

/**
 * One band of the page. The home page alternates `tone="a"` (off-white in the light theme) and
 * `tone="b"` (black), so the eye gets a rhythm instead of one long dark scroll. The tone sets the
 * --home-* variables for everything inside, so children keep using `text-home-muted` and the like.
 */
export function Section({ tone, id, className, children }: { tone: "a" | "b"; id?: string; className?: string; children: React.ReactNode }) {
    return (
        <section id={id} className={cn(tone === "a" ? "home-a" : "home-b", id && "scroll-mt-20", className)}>
            {children}
        </section>
    );
}

/** A small label over a section title, with a short rule before it. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn("flex items-center gap-3 text-sm text-home-muted", className)}>
            <span className="h-px w-8 bg-current" aria-hidden />{children}
        </p>
    );
}
