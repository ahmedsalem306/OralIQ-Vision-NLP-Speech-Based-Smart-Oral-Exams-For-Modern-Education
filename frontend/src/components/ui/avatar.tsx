import { cn } from "../../lib/utils";

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };

/** First letter of the first two words: "د. سلمى عبد" → "سع" (skips titles like "د."). */
function initials(name?: string | null) {
    const words = (name || "").split(/\s+/).filter((w) => w && !w.endsWith("."));
    return words.slice(0, 2).map((w) => w[0]).join("") || "؟";
}

export function Avatar({ name, src, size = "md", className }: { name?: string | null; src?: string | null; size?: keyof typeof sizes; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pen-wash font-display font-semibold text-pen",
                sizes[size],
                className,
            )}
            aria-hidden
        >
            {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
        </span>
    );
}
