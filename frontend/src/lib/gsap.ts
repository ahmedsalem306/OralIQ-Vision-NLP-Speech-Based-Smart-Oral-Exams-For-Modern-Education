import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** One easing for scroll-driven scenes, matching motion's EASE (quick out, soft landing). */
export const GSAP_EASE = "power3.out";

/** Runs `scenes` only when the visitor hasn't asked for reduced motion; `still` sets the resting state otherwise. */
export function withMotion(scenes: () => void, still?: () => void) {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", scenes);
    if (still) mm.add("(prefers-reduced-motion: reduce)", still);
    return mm;
}

export { gsap, ScrollTrigger, useGSAP };
