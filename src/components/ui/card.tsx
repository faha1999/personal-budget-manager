  // TODO: add card styling, padding, and optional header/footer slots.
import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("card card-hover", className)}>{children}</div>;
}

export function CardHeader({
  className,
  title,
  subtitle,
  right,
}: {
  className?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5", className)}>
      <div>
        <div className="text-base font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-sm subtle">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("border-t border-[rgb(var(--border))] px-5 py-4", className)}>
      {children}
    </div>
  );
}
