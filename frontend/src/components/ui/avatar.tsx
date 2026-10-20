import { cn } from "../../lib/utils";

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };

// Stable shade per name: three greys, so the same person always looks the same without adding colour.
const tints = ["bg-pen-wash text-ink", "bg-rule text-ink", "bg-ink text-paper"];
function tintFor(name?: string | null) {
    let h = 0;
    for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return tints[h % tints.length];
}

/** First letter of the first two words: "د. سلمى عبد" → "سع" (skips titles like "د."). */
function initials(name?: string | null) {
    const words = (name || "").split(/\s+/).filter((w) => w && !w.endsWith("."));
    return words.slice(0, 2).map((w) => w[0]).join("") || "؟";
}

export function Avatar({ name, src, size = "md", className }: { name?: string | null; src?: string | null; size?: keyof typeof sizes; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold",
                tintFor(name),
                sizes[size],
                className,
            )}
            aria-hidden
        >
            {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
        </span>
    );
}
