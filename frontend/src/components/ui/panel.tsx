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

/** The base surface: a card lifted off the page with a soft shadow. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return <section className={cn("rounded-[var(--radius-panel)] border border-rule/80 bg-sheet shadow-card", className)} {...props} />;
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
                <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
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
                <h1 className="text-[1.875rem] font-bold leading-tight tracking-tight sm:text-[2.25rem]">{title}</h1>
                {description && <p className="mt-2 text-[1.0625rem] text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export type StatTone = "pen" | "violet" | "teal" | "warn" | "mark" | "pass";

const toneChip: Record<StatTone, string> = {
    pen: "bg-pen-wash text-pen",
    violet: "bg-violet-wash text-violet",
    teal: "bg-teal-wash text-teal",
    warn: "bg-warn-wash text-warn",
    mark: "bg-mark-wash text-mark",
    pass: "bg-pass-wash text-pass",
};

export interface StatItem {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    tone?: StatTone;
}

/** Key figures as a row of small cards, each with a tinted icon. */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
    const cols = items.length === 3 ? "lg:grid-cols-3" : items.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4";
    return (
        <dl className={cn("grid grid-cols-2 gap-3 sm:gap-4", cols, className)}>
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div
                        key={i}
                        className={cn(
                            "@container rounded-[var(--radius-panel)] border border-rule/80 bg-sheet p-4 shadow-card sm:p-5",
                            items.length % 2 === 1 && i === items.length - 1 && "col-span-2 lg:col-span-1",
                        )}
                    >
                        <dt className="flex items-start justify-between gap-3 text-sm font-medium text-ink-2">
                            <span>{item.label}</span>
                            {/* A narrow card gives its width to the label instead of the icon */}
                            {Icon && (
                                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl @max-[10.5rem]:hidden [&>svg]:size-[18px]", toneChip[item.tone ?? "pen"])} aria-hidden>
                                    <Icon />
                                </span>
                            )}
                        </dt>
                        <dd className="mt-2 font-display text-[1.875rem] font-bold leading-none text-ink"><AnimatedValue value={item.value} /></dd>
                        {item.hint && <dd className="mt-2 text-xs text-ink-3">{item.hint}</dd>}
                    </div>
                );
            })}
        </dl>
    );
}
