import { cn } from "../../lib/utils";
import { FACE_DARK, FACE_EDGES, FACE_LIGHT } from "./faceMesh";

type Face = { width: number; height: number; points: string };

/** The mesh as two SVG paths: the contour lines, and a small square per landmark. */
function meshOf(face: Face) {
    const pts = face.points.split(" ").map((p) => p.split(",").map(Number) as [number, number]);
    const edges = FACE_EDGES.map(([a, b]) => `M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`).join("");
    const dots = pts.map(([x, y]) => `M${(x - 2).toFixed(1)} ${(y - 2).toFixed(1)}h4v4h-4z`).join("");
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const box = { x: Math.min(...xs) / 10, y: Math.min(...ys) / 10, w: (Math.max(...xs) - Math.min(...xs)) / 10, h: (Math.max(...ys) - Math.min(...ys)) / 10 };
    return { edges, dots, box };
}

const MESH = { light: meshOf(FACE_LIGHT), dark: meshOf(FACE_DARK) };
const PHOTO = { light: { base: "/photos/face-light", ...FACE_LIGHT }, dark: { base: "/photos/face-dark", ...FACE_DARK } };

/**
 * A black-and-white portrait with the face mesh the exam room tracks: MediaPipe FaceMesh with
 * refineLandmarks, 478 points, computed on this photo (faceMesh.ts). The mesh is drawn top to
 * bottom on load and a scan line passes over the face now and then; reduced motion shows it still.
 * Light and dark themes each get their own photo, so it sits on its background.
 */
export function FaceScan({ tone, priority = false, className }: { tone: "light" | "dark"; priority?: boolean; className?: string }) {
    const { edges, dots, box } = MESH[tone];
    const photo = PHOTO[tone];
    return (
        <div className={cn("relative", className)}>
            <img
                src={`${photo.base}-960.webp`}
                srcSet={[480, 720, 960, 1280].map((w) => `${photo.base}-${w}.webp ${w}w`).join(", ")}
                sizes="(min-width: 1024px) 40vw, 90vw"
                width={photo.width}
                height={photo.height}
                alt=""
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : undefined}
                decoding="async"
                className="block h-auto w-full"
            />
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 size-full text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.5)] motion-safe:animate-[home-mesh-in_2.4s_ease-out_0.5s_both]" aria-hidden>
                {/* A dark halo under the mesh so it stays legible over light skin, then the mesh itself */}
                <path d={edges} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />
                <path d={edges} fill="none" stroke="currentColor" strokeOpacity={0.95} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <path d={dots} fill="currentColor" />
            </svg>
            <div className="pointer-events-none absolute" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }} aria-hidden>
                <span className="absolute inset-x-[-6%] top-0 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 shadow-[0_0_18px_3px_rgba(255,255,255,0.7)] motion-safe:animate-[home-scan_7s_ease-in-out_3s_infinite]" />
            </div>
        </div>
    );
}
