import { cn } from "../../lib/utils";

/** The pen loop (the same hand as the grade circle) drawn round a number. */
function Loop({ width }: { width: number }) {
    return (
        <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-12" aria-hidden>
            <path d="M24 5c10.5 0 19 8.2 19 18.6S34.6 43 23.6 43 5 34.6 5 24.2 13.2 6 25.6 6.4" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" />
        </svg>
    );
}

/** A step written as an exam question number ("س١" / "Q1"), circled in ballpoint blue. */
export function QuestionNumber({ label }: { label: string }) {
    return (
        <span className="relative inline-flex size-14 items-center justify-center font-display text-base font-bold text-pen">
            <Loop width={2.2} />
            <span className="relative">{label}</span>
        </span>
    );
}

/** A grader's note number, circled in red pen; readable when it sits on a screenshot. */
export function NoteNumber({ n, className, style }: { n: number; className?: string; style?: React.CSSProperties }) {
    return (
        <span className={cn("relative flex size-10 shrink-0 items-center justify-center font-display text-base font-bold text-mark", className)} style={style} aria-hidden>
            <span className="absolute inset-1 rounded-full bg-sheet/95" />
            <Loop width={2.6} />
            <span className="relative tabular">{n}</span>
        </span>
    );
}

/** The grader's underline under a figure. */
export function PenUnderline() {
    return (
        <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-4 h-3 w-full text-mark" aria-hidden>
            <path d="M3 8C30 3 60 10 90 5s25 1 27-1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
