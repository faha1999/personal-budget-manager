  // TODO: style inputs, support error states, and mobile numeric keypad for amounts.
import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  rightAdornment?: React.ReactNode;
  leftAdornment?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, rightAdornment, leftAdornment, type, ...props }, ref) => {
    const hasError = Boolean(error);

    const inputClass =
      "input " +
      (hasError
        ? "border-red-300 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] focus:border-red-400"
        : "");

    // Mobile numeric keypad improvements
    const inputMode =
      props.inputMode ??
      (type === "number" || type === "tel" ? "decimal" : undefined);

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label className="mb-1.5 block text-sm font-semibold text-[rgb(var(--ink))]">
            {label}
          </label>
        )}

        <div className="relative">
          {leftAdornment && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[rgb(var(--subtle))]">
              {leftAdornment}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            inputMode={inputMode}
            className={cn(
              inputClass,
              leftAdornment ? "pl-10" : "",
              rightAdornment ? "pr-10" : ""
            )}
            {...props}
          />

          {rightAdornment && (
            <div className="absolute inset-y-0 right-3 flex items-center text-[rgb(var(--subtle))]">
              {rightAdornment}
            </div>
          )}
        </div>

        {hasError ? (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-[rgb(var(--subtle))]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
