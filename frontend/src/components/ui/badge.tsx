import * as React from "react";
import { cn } from "../../lib/utils";
import type { Tone } from "../../lib/grades";

const tones: Record<Tone, string> = {
    neutral: "bg-sheet-2 text-ink-2 border-rule",
    pen: "bg-pen-wash text-pen border-transparent",
    pass: "bg-pass-wash text-pass border-transparent",
    warn: "bg-warn-wash text-warn border-transparent",
    mark: "bg-mark-wash text-mark border-transparent",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
    icon?: React.ReactNode;
}

export function Badge({ tone = "neutral", icon, className, children, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-5",
                "[&>svg]:size-3.5",
                tones[tone],
                className,
            )}
            {...props}
        >
            {icon}
            {children}
        </span>
    );
}
