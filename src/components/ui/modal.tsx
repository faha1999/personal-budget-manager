  // TODO: implement overlay, focus trap, and animations for modal dialog.
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ModalProps = {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  React.useEffect(() => {
    if (!open) return;

    const el = containerRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const prevActive = document.activeElement as HTMLElement | null;

    // focus first item
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // handled by parent optionally; keep here for safety
      }
      if (e.key !== "Tab") return;

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, [open, containerRef]);
}

export function Modal({ open, title, description, onClose, children, footer, className }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* dialog */}
      <div className="relative mx-auto flex min-h-dvh max-w-xl items-center px-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-full rounded-2xl border border-[rgb(var(--border))] bg-white/95 backdrop-blur p-5 shadow-[var(--shadow)]",
            "animate-[modalIn_180ms_ease-out]",
            className
          )}
        >
          {(title || description) && (
            <div className="mb-4">
              {title ? <div className="text-lg font-semibold">{title}</div> : null}
              {description ? <div className="mt-1 text-sm subtle">{description}</div> : null}
            </div>
          )}

          <div>{children}</div>

          {footer ? (
            <div className="mt-5 border-t border-[rgb(var(--border))] pt-4">{footer}</div>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
