import * as React from "react";
import {
    animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
    type HTMLMotionProps, type Variants,
} from "motion/react";
import { cn } from "../lib/utils";

/** One easing for the whole site: quick out, soft landing. */
export const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps extends HTMLMotionProps<"div"> {
    delay?: number;
    /** Distance travelled, px. */
    y?: number;
}

/** Fades and lifts content in the first time it scrolls into view. */
export function Reveal({ delay = 0, y = 28, className, children, ...props }: RevealProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: EASE, delay }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

const staggerParent: Variants = {
    hidden: {},
    show: (gap: number = 0.09) => ({ transition: { staggerChildren: gap } }),
};
export const staggerChild: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Children marked with `staggerChild` appear one after another. */
export function Stagger({ gap = 0.09, className, children, as = "div", amount = 0.2 }: { gap?: number; className?: string; children: React.ReactNode; as?: "div" | "ul" | "ol" | "dl"; amount?: number }) {
    const Comp = motion[as] as typeof motion.div;
    return (
        <Comp className={className} variants={staggerParent} custom={gap} initial="hidden" whileInView="show" viewport={{ once: true, amount }}>
            {children}
        </Comp>
    );
}

/** Counts from 0 to `to` the first time it is seen. */
export function CountUp({ to, decimals = 0, duration = 1.4, suffix = "", className }: { to: number; decimals?: number; duration?: number; suffix?: string; className?: string }) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const reduce = useReducedMotion();
    const value = useMotionValue(0);
    const [text, setText] = React.useState((0).toFixed(decimals));

    React.useEffect(() => value.on("change", (v) => setText(v.toFixed(decimals))), [value, decimals]);
    React.useEffect(() => {
        if (!inView) return;
        if (reduce) { value.set(to); return; }
        const controls = animate(value, to, { duration, ease: EASE });
        return () => controls.stop();
    }, [inView, reduce, to, duration, value]);

    return <span ref={ref} className={className}>{text}{suffix}</span>;
}

/** Thin reading-progress bar pinned to the top of the page. */
export function ScrollProgress({ className }: { className?: string }) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
    return (
        <motion.div
            aria-hidden
            style={{ scaleX }}
            className={cn("fixed inset-x-0 top-0 z-50 h-[3px] origin-[0%] bg-gradient-to-r from-pen via-violet to-teal rtl:origin-[100%]", className)}
        />
    );
}

/**
 * Scroll-linked value for an element: 0 when it enters the bottom of the screen,
 * 1 when its centre reaches the centre. Handy for tilt/scale reveals.
 */
export function useEnterProgress<T extends HTMLElement>() {
    const ref = React.useRef<T>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
    return { ref, progress: scrollYProgress };
}

/** True on devices with a real mouse (not touch) and no reduced-motion preference. */
function canHover() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A soft light that follows the pointer across the card (desktop only). */
export function Spotlight({ className, children, color = "var(--pen)", ...props }: React.HTMLAttributes<HTMLDivElement> & { color?: string }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el || !canHover()) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    return (
        <div ref={ref} onPointerMove={onMove} className={cn("group/spot relative isolate overflow-hidden", className)} {...props}>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
                style={{ background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, ${color} 14%, transparent), transparent 45%)` }}
            />
            {children}
        </div>
    );
}

/** Tilts gently toward the pointer in 3D (desktop only). */
export function TiltCard({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const rotateX = useSpring(rx, { stiffness: 160, damping: 18 });
    const rotateY = useSpring(ry, { stiffness: 160, damping: 18 });
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!canHover()) return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
    };
    const reset = () => { rx.set(0); ry.set(0); };
    return (
        <div className={cn("[perspective:1200px]", className)} onPointerMove={onMove} onPointerLeave={reset}>
            <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>{children}</motion.div>
        </div>
    );
}

/** Pulls its child a few pixels toward the pointer — used once, on the main CTA. */
export function Magnetic({ children, strength = 10, className }: { children: React.ReactNode; strength?: number; className?: string }) {
    const x = useSpring(0, { stiffness: 220, damping: 16 });
    const y = useSpring(0, { stiffness: 220, damping: 16 });
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!canHover()) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
    };
    return (
        <motion.div style={{ x, y }} onPointerMove={onMove} onPointerLeave={() => { x.set(0); y.set(0); }} className={cn("inline-flex", className)}>
            {children}
        </motion.div>
    );
}

/** Hand-drawn tick that draws itself — the "done" moment after submitting. */
export function DrawnCheck({ className, delay = 0.1 }: { className?: string; delay?: number }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
            <motion.circle
                cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity={0.25}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: EASE, delay }}
            />
            <motion.path
                d="M20 33.5 28.5 42 45 24" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: EASE, delay: delay + 0.45 }}
            />
        </svg>
    );
}

export { motion, useScroll, useTransform, useSpring, useReducedMotion };
