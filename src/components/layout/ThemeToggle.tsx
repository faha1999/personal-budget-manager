"use client";

import { Monitor, Moon, SunMedium } from "lucide-react";
import * as React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button, ButtonProps } from "@/components/ui/button";

type Size = "sm" | "md";

type ThemeToggleProps = {
  size?: Size;
  showLabel?: boolean;
  fullWidth?: boolean;
  variant?: Extract<ButtonProps["variant"], "secondary" | "ghost">;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ThemeToggle({
  size = "md",
  showLabel = true,
  fullWidth,
  variant = "secondary",
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const icon =
    theme === "system"
      ? (<Monitor size={16} />)
      : resolvedTheme === "dark"
        ? (<Moon size={16} />)
        : (<SunMedium size={16} />);

  const label = theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light";
  const resolvedHint = theme === "system" ? (resolvedTheme === "dark" ? "Dark now" : "Light now") : null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      leftIcon={icon}
      onClick={cycleTheme}
      aria-label={`Switch theme (current ${theme})`}
      className={cn(fullWidth && "w-full justify-between", !showLabel && "px-2", className)}
    >
      {showLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold">{label}</span>
          {resolvedHint ? <span className="text-xs text-[rgb(var(--muted))]">{resolvedHint}</span> : null}
        </span>
      ) : (
        <span className="sr-only">Switch theme</span>
      )}
    </Button>
  );
}
