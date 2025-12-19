  // TODO: style button variants (primary/secondary/ghost) and loading/disabled states.

  import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
      "focus-ring active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

    const sizes: Record<Size, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-base",
    };

    const variants: Record<Variant, string> = {
      primary:
        "text-white shadow-[var(--shadow-sm)] " +
        "bg-[linear-gradient(135deg,rgb(var(--brand))_0%,rgb(var(--brand-2))_100%)]",
      secondary:
        "bg-white/90 backdrop-blur border border-[rgb(var(--border))] text-[rgb(var(--ink))] " +
        "hover:bg-white shadow-[var(--shadow-sm)]",
      ghost:
        "bg-transparent text-[rgb(var(--ink))] hover:bg-[rgba(var(--ink),0.08)]",
      danger:
        "text-white shadow-[var(--shadow-sm)] bg-[linear-gradient(135deg,#ef4444_0%,#f97316_100%)]",
    };

    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span className="opacity-90">Loading</span>
          </span>
        ) : (
          <>
            {leftIcon}
            <span>{children}</span>
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
