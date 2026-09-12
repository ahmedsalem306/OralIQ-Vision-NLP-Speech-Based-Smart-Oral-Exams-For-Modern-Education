/** Pixel-based pupil center — tracks real pupils better than MediaPipe iris for up/down. */

export type Pt = { x: number; y: number };

export type PupilHit = {
    /** 0..1 horizontal in eye box (0=outer side, 1=inner) */
    h: number;
    /** 0..1 vertical in eye box (0=top/up, 1=bottom/down) */
    v: number;
    /** Absolute normalized coords (same space as MediaPipe landmarks) */
    x: number;
    y: number;
};

function lum(data: Uint8ClampedArray, i: number): number {
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

/**
 * Find darkest-region centroid inside the eye landmarks.
 * Returns null if eye ROI is too small / no dark pixels.
 */
export function estimatePupilFromPixels(
    img: ImageData,
    outer: Pt,
    inner: Pt,
    top: Pt,
    bot: Pt,
): PupilHit | null {
    const W = img.width;
    const H = img.height;
    const data = img.data;

    const x0 = Math.min(outer.x, inner.x);
    const x1 = Math.max(outer.x, inner.x);
    const y0 = Math.min(top.y, bot.y);
    const y1 = Math.max(top.y, bot.y);
    const ew = x1 - x0;
    const eh = y1 - y0;
    if (ew < 0.012 || eh < 0.006) return null;

    // Slight inset — avoid lashes / lids noise
    const padX = ew * 0.12;
    const padY = eh * 0.10;
    const minPx = Math.max(0, Math.floor((x0 + padX) * W));
    const maxPx = Math.min(W - 1, Math.ceil((x1 - padX) * W));
    const minPy = Math.max(0, Math.floor((y0 + padY) * H));
    const maxPy = Math.min(H - 1, Math.ceil((y1 - padY) * H));
    if (maxPx - minPx < 4 || maxPy - minPy < 3) return null;

    // Pass 1: darkest luminance in ROI
    let minL = 255;
    for (let y = minPy; y <= maxPy; y++) {
        for (let x = minPx; x <= maxPx; x++) {
            const L = lum(data, (y * W + x) * 4);
            if (L < minL) minL = L;
        }
    }
    // Pass 2: centroid of near-darkest pixels (pupil)
    const thr = Math.min(minL + 28, 95);
    let sumX = 0, sumY = 0, sumW = 0;
    for (let y = minPy; y <= maxPy; y++) {
        for (let x = minPx; x <= maxPx; x++) {
            const L = lum(data, (y * W + x) * 4);
            if (L <= thr) {
                const w = thr - L + 1;
                sumX += x * w;
                sumY += y * w;
                sumW += w;
            }
        }
    }
    if (sumW < 8) return null;

    const cx = sumX / sumW / W;
    const cy = sumY / sumW / H;
    return {
        h: (cx - x0) / Math.max(ew, 1e-6),
        v: (cy - y0) / Math.max(eh, 1e-6),
        x: cx,
        y: cy,
    };
}

export function averagePupils(a: PupilHit | null, b: PupilHit | null): PupilHit | null {
    if (a && b) {
        return {
            h: (a.h + b.h) / 2,
            v: (a.v + b.v) / 2,
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
        };
    }
    return a || b;
}
