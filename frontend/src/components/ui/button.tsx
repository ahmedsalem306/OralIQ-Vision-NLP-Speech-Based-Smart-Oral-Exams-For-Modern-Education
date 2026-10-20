import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
    primary: "bg-pen text-pen-ink shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--pen)_70%,transparent)] hover:bg-pen-hover hover:shadow-[0_10px_24px_-8px_color-mix(in_oklab,var(--pen)_80%,transparent)]",
    secondary: "bg-sheet text-ink border border-field/80 hover:border-ink-2 hover:bg-sheet-2",
    ghost: "text-ink-2 hover:text-ink hover:bg-pen-wash",
    danger: "bg-mark text-pen-ink hover:opacity-90",
    "danger-ghost": "text-mark hover:bg-mark-wash",
};

const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm gap-1.5",
    md: "h-11 px-4 text-[0.9375rem] gap-2",
    lg: "h-12 px-6 text-base gap-2",
    icon: "h-11 w-11",
    "icon-sm": "h-9 w-9",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
    return cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-semibold",
        "transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-150 active:translate-y-px",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
    );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", loading = false, disabled, children, type = "button", ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonClasses(variant, size, className)}
            {...props}
        >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {children}
        </button>
    ),
);
Button.displayName = "Button";

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
    return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
