import * as React from "react";
import { cn } from "../../lib/utils";
// Real figures from the API, counted up on purpose (owner's choice). avoid-ai-design-ignore-file: M5
import { CountUp } from "../motion";

/** Numbers ("71%", "6", 91.5) count up once; anything else renders as-is. */
function AnimatedValue({ value }: { value: React.ReactNode }) {
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : null;
    const m = text?.match(/^(\d+(?:\.(\d+))?)(%?)$/);
    if (!m) return <>{value}</>;
    return <CountUp to={parseFloat(m[1])} decimals={m[2]?.length ?? 0} suffix={m[3]} duration={1.1} />;
}

/** The base surface: a white sheet with a hairline edge. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return <section className={cn("border border-rule bg-sheet", className)} {...props} />;
}

interface PanelHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
    return (
        <header className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4 sm:px-6", className)}>
            <div className="min-w-0">
                <h2 className="text-[1.375rem] font-extrabold leading-tight">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    );
}

/** Ruled rows inside a card. */
export function RuledList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
    return <ul role="list" className={cn("divide-y divide-rule", className)} {...props} />;
}

interface PageHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
                <h1 className="text-[2.25rem] font-extrabold leading-[1.1] sm:text-[3rem]">{title}</h1>
                {description && <p className="mt-2 text-[1.0625rem] text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export type StatTone = "pen" | "violet" | "teal" | "warn" | "mark" | "pass";

const toneText: Record<StatTone, string> = {
    pen: "text-ink",
    violet: "text-ink",
    teal: "text-ink",
    warn: "text-warn",
    mark: "text-mark",
    pass: "text-pass",
};

export interface StatItem {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    tone?: StatTone;
}

/**
 * Key figures as one ruled strip, like the totals row of a mark sheet.
 * Colour appears only when a figure needs attention (warn / mark tones).
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
    const cols = items.length === 3 ? "lg:grid-cols-3" : items.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4";
    return (
        <dl className={cn("grid grid-cols-2 gap-px border border-rule bg-rule", cols, className)}>
            {items.map((item, i) => {
                const Icon = item.icon;
                const alert = item.tone === "warn" || item.tone === "mark";
                return (
                    <div
                        key={i}
                        className={cn(
                            "bg-sheet p-4 sm:p-5",
                            items.length % 2 === 1 && i === items.length - 1 && "col-span-2 lg:col-span-1",
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {Icon && <span className={cn("[&>svg]:size-4", alert ? toneText[item.tone ?? "pen"] : "text-ink-3")} aria-hidden><Icon /></span>}
                            <dt className="text-sm font-medium text-ink-2">{item.label}</dt>
                        </div>
                        <dd className={cn("mt-3 font-display text-[2.5rem] font-extrabold leading-none", alert ? toneText[item.tone ?? "pen"] : "text-ink")}><AnimatedValue value={item.value} /></dd>
                        {item.hint && <dd className="mt-2 text-xs text-ink-3">{item.hint}</dd>}
                    </div>
                );
            })}
        </dl>
    );
}
