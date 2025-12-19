"use client";

import * as React from "react";
import { Button } from "./button";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  editLabel?: string;
  closeLabel?: string;
};

export function EditToggleCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
  editLabel = "Edit",
  closeLabel = "Close",
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        <Button
          size="sm"
          variant={open ? "secondary" : "primary"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? closeLabel : editLabel}
        </Button>
      </div>

      {open ? (
        <div className="mt-4">{children}</div>
      ) : (
        <p className="mt-4 text-xs text-slate-600">Click {editLabel.toLowerCase()} to open the form.</p>
      )}
    </section>
  );
}
