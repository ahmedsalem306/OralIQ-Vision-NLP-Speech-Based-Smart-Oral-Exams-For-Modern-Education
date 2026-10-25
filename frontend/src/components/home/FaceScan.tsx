import { cn } from "../../lib/utils";

/**
 * Seamless Centerpiece Face-Mesh Video:
 * - Uses the background-unified 1080x1920 biometric animation (/media/hero-face-mesh.mp4)
 *   whose background is unified to #0E0804 and feathered with a multi-stop radial mask
 *   so the character looks like an integral piece of the Hero box itself.
 */
export function FaceScan({ priority = false, className }: { tone?: "light" | "dark"; priority?: boolean; className?: string }) {
    const maskStyle: React.CSSProperties = {
        WebkitMaskImage:
            "radial-gradient(ellipse 44% 58% at 50% 47%, #000 50%, rgba(0,0,0,0.72) 67%, rgba(0,0,0,0.2) 83%, transparent 95%)",
        maskImage:
            "radial-gradient(ellipse 44% 58% at 50% 47%, #000 50%, rgba(0,0,0,0.72) 67%, rgba(0,0,0,0.2) 83%, transparent 95%)",
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
                className="block h-full w-full object-contain object-bottom"
            >
                <source src="/media/hero-face-mesh.mp4" type="video/mp4" />
            </video>
        </div>
    );
}
