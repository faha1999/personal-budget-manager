 //     TODO: Profile settings, data export, and theme toggles.
"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [name, setName] = useState("User");
  const [email, setEmail] = useState("you@example.com");
  const [theme, setTheme] = useState<"light" | "system">("light");

  return (
    <div className="space-y-6">
      <Header
        title="Settings"
        subtitle="Profile preferences, export tools, and clean configuration."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profile" subtitle="Basic account settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={input()} />
            </Field>
            <Field label="Email (display only)">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={input()} />
            </Field>
          </div>

          <div className="mt-5 flex gap-2">
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Save changes
            </button>
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50">
              Cancel
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            TODO: Connect to profile table and session user data.
          </p>
        </Card>

        <Card title="Theme" subtitle="Premium clean canvas">
          <div className="space-y-3">
            <Radio
              checked={theme === "light"}
              label="Light"
              desc="Best for readability and premium minimal UI."
              onClick={() => setTheme("light")}
            />
            <Radio
              checked={theme === "system"}
              label="System"
              desc="Follow OS preferences (future-ready)."
              onClick={() => setTheme("system")}
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Note: current app uses light-first design. Dark mode can be added later.
          </p>
        </Card>
      </div>

      <Card title="Data export" subtitle="Your data is yours">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExportButton title="Export transactions" desc="CSV / JSON" />
          <ExportButton title="Export accounts" desc="CSV / JSON" />
          <ExportButton title="Export full backup" desc="One bundle" />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-xs font-semibold text-slate-900">Privacy</p>
          <p className="mt-1 text-xs text-slate-600">
            Personal finance only. No third-party integrations. Data stays within your account scope.
          </p>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          TODO: Implement export endpoints: /api/export/* (CSV/JSON).
        </p>
      </Card>
    </div>
  );
}

/* ---------- UI ---------- */

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function input() {
  return "w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-slate-900/25";
}

function Radio({
  checked,
  label,
  desc,
  onClick,
}: {
  checked: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl p-4 text-left ring-1 transition",
        checked ? "bg-slate-50 ring-slate-900/20" : "bg-white ring-black/10 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-600">{desc}</p>
        </div>
        <span
          className={[
            "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border",
            checked ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white",
          ].join(" ")}
        >
          {checked ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
        </span>
      </div>
    </button>
  );
}

function ExportButton({ title, desc }: { title: string; desc: string }) {
  return (
    <button
      type="button"
      className="rounded-2xl bg-white p-4 text-left ring-1 ring-black/10 transition hover:bg-slate-50"
      onClick={() => alert("TODO: Connect export endpoint")}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-slate-900">Download →</p>
    </button>
  );
}
