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

export { motion, useScroll, useTransform, useSpring, useReducedMotion };
