import { cn } from "../../lib/utils";

/**
 * Full-Height Seamless Centerpiece Face-Mesh Video:
 * - Uses the custom 1080x1920 biometric face-mesh video (/media/hero-face-mesh.mp4).
 * - Multi-stop radial mask reaches 0% opacity well inside the 9:16 frame boundaries
 *   so there is zero visible vertical edge or shadow anywhere around the character.
 */
export function FaceScan({ priority = false, className }: { tone?: "light" | "dark"; priority?: boolean; className?: string }) {
    const maskStyle: React.CSSProperties = {
        WebkitMaskImage:
            "radial-gradient(ellipse 43% 62% at 54% 52%, #000 52%, rgba(0,0,0,0.75) 68%, rgba(0,0,0,0.25) 84%, transparent 97%)",
        maskImage:
            "radial-gradient(ellipse 43% 62% at 54% 52%, #000 52%, rgba(0,0,0,0.75) 68%, rgba(0,0,0,0.25) 84%, transparent 97%)",
    };

    return (
        <div className={cn("relative select-none pointer-events-none flex items-end justify-center", className)}>
            <video
                poster="/media/hero-face-mesh-poster.webp"
                autoPlay
                loop
                muted
                playsInline
                preload={priority ? "auto" : "metadata"}
                style={maskStyle}
                className="block h-full w-full object-contain object-bottom -translate-x-[4%]"
            >
                <source src="/media/hero-face-mesh.mp4" type="video/mp4" />
            </video>
        </div>
    );
}
