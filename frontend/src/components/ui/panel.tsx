import * as React from "react";
import { cn } from "../../lib/utils";

/** A sheet of paper on the desk: the base container for grouped content. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return <section className={cn("rounded-[var(--radius-panel)] border border-rule bg-sheet", className)} {...props} />;
}

interface PanelHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
    return (
        <header className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4", className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    );
}

/** Ruled rows, like lines on an answer sheet. */
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
                <h1 className="text-[1.75rem] font-bold leading-tight sm:text-[2rem]">{title}</h1>
                {description && <p className="mt-2 text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export interface StatItem {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
}

/** A single ruled strip of figures — reads like the summary line at the top of a grade sheet. */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
    return (
        <dl
            className={cn(
                "grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-rule bg-sheet sm:grid-cols-4",
                "[&>div]:border-rule [&>div:nth-child(odd)]:border-e sm:[&>div]:border-e sm:[&>div:last-child]:border-e-0",
                "[&>div:nth-child(-n+2)]:border-b sm:[&>div:nth-child(-n+2)]:border-b-0",
                className,
            )}
        >
            {items.map((item, i) => (
                <div key={i} className={cn("px-5 py-4", items.length % 2 === 1 && i === items.length - 1 && "max-sm:col-span-2 max-sm:border-e-0")}>
                    <dt className="text-sm text-ink-2">{item.label}</dt>
                    <dd className="mt-1 font-display text-[1.75rem] font-semibold leading-none text-ink">{item.value}</dd>
                    {item.hint && <dd className="mt-1.5 text-xs text-ink-3">{item.hint}</dd>}
                </div>
            ))}
        </dl>
    );
}
