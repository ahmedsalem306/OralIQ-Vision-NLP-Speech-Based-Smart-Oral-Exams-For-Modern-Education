import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("oiq-skeleton rounded-md", className)} aria-hidden />;
}

/** Ruled-row placeholders while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="divide-y divide-rule" aria-busy aria-live="polite">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-8 w-14" />
                </div>
            ))}
        </div>
    );
}

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    body?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
            {icon && (
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-pen-wash text-pen [&>svg]:size-6">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold">{title}</h3>
            {body && <p className="mt-1.5 max-w-sm text-ink-2">{body}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

const alertTones = {
    info: { cls: "bg-pen-wash text-ink border-pen/20", icon: Info, iconCls: "text-pen" },
    success: { cls: "bg-pass-wash text-ink border-pass/25", icon: CheckCircle2, iconCls: "text-pass" },
    warning: { cls: "bg-warn-wash text-ink border-warn/25", icon: TriangleAlert, iconCls: "text-warn" },
    error: { cls: "bg-mark-wash text-ink border-mark/25", icon: AlertCircle, iconCls: "text-mark" },
};

interface AlertProps {
    tone?: keyof typeof alertTones;
    title?: React.ReactNode;
    children?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
    const t = alertTones[tone];
    const Icon = t.icon;
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn("flex items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm", t.cls, className)}
        >
            <Icon className={cn("mt-0.5 size-[18px] shrink-0", t.iconCls)} aria-hidden />
            <div className="min-w-0 flex-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={cn("text-ink-2", title && "mt-0.5")}>{children}</div>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    size?: "sm" | "md" | "lg";
}

/** Native <dialog>: focus trap, Esc to close and top-layer stacking come for free. */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
    const ref = React.useRef<HTMLDialogElement>(null);
    const titleId = React.useId();

    React.useEffect(() => {
        const dlg = ref.current;
        if (!dlg) return;
        if (open && !dlg.open) {
            dlg.showModal();
            dlg.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        }
        if (!open && dlg.open) dlg.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={(e) => { e.preventDefault(); onClose(); }}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}
            className={cn(
                "m-auto w-[calc(100%-2rem)] rounded-[var(--radius-panel)] border border-rule bg-sheet p-0 text-ink shadow-pop",
                "backdrop:bg-overlay backdrop:backdrop-blur-[2px] open:animate-[oiq-pop-in_180ms_ease-out]",
                size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl",
            )}
        >
            {open && (
                <div className="flex max-h-[min(85vh,760px)] flex-col">
                    <header className={cn("px-6 py-4", (children || footer) && "border-b border-rule")}>
                        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
                        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
                    </header>
                    {children && <div className="overflow-y-auto px-6 py-5">{children}</div>}
                    {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-rule px-6 py-4">{footer}</footer>}
                </div>
            )}
        </dialog>
    );
}

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    label: string;
    header?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
}

/** Side sheet on the end side of the page — for reviewing one record without losing the list. */
export function Drawer({ open, onClose, label, header, children, footer }: DrawerProps) {
    const ref = React.useRef<HTMLDialogElement>(null);

    React.useEffect(() => {
        const dlg = ref.current;
        if (!dlg) return;
        if (open && !dlg.open) {
            dlg.showModal();
            dlg.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        }
        if (!open && dlg.open) dlg.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-label={label}
            onCancel={(e) => { e.preventDefault(); onClose(); }}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}
            className={cn(
                "fixed inset-y-0 m-0 ms-auto h-dvh max-h-dvh w-full max-w-2xl border-s border-rule bg-sheet p-0 text-ink shadow-pop",
                "backdrop:bg-overlay open:animate-[oiq-fade-in_160ms_ease-out]",
            )}
        >
            {open && (
                <div className="print-expand flex h-full flex-col">
                    {header && <div className="shrink-0 border-b border-rule px-5 py-3 sm:px-7">{header}</div>}
                    <div className="print-expand flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
                    {footer && <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-rule px-5 py-3 sm:px-7 print:hidden">{footer}</div>}
                </div>
            )}
        </dialog>
    );
}

interface SegmentedProps<T extends string> {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: React.ReactNode }[];
    label: string;
    className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
    const pillId = React.useId();
    return (
        <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-[var(--radius-control)] border border-rule bg-sheet-2 p-1 [scrollbar-width:none]", className)}>
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            "relative shrink-0 whitespace-nowrap rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-colors",
                            active ? "text-ink" : "text-ink-2 hover:text-ink",
                        )}
                    >
                        {/* The selected pill slides between options */}
                        {active && (
                            <motion.span
                                layoutId={`seg-${pillId}`}
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                className="absolute inset-0 rounded-[7px] bg-sheet shadow-[0_1px_2px_rgba(23,33,58,0.12)] ring-1 ring-rule"
                                aria-hidden
                            />
                        )}
                        <span className="relative">{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
