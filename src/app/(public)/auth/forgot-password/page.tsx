
//      TODO: Optional password reset entry with email flow or instructions.



"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { sanitizeEmail, sanitizeText } from "@/shared/security/sanitize";

type Status = { type: "idle" | "success" | "error"; message?: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "idle" });

    const trimmed = sanitizeEmail(email) || email.trim().toLowerCase();
    if (!trimmed) {
      setStatus({ type: "error", message: "Email is required." });
      return;
    }
    if (!isValidEmail(trimmed)) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      // Optional endpoint — implement later if you want.
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        // If endpoint isn't implemented yet, show a graceful instruction
        setStatus({
          type: "success",
          message:
            "If your account exists, we’ve noted your request. (If email reset isn't enabled yet, please contact support/admin or create a new account.)",
        });
        return;
      }

      setStatus({
        type: "success",
        message:
          "If an account exists for that email, a reset link will be sent. Please check your inbox (and spam).",
      });
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-app text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="flex justify-end">
            <ThemeToggle size="sm" variant="ghost" showLabel={false} />
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <span className="text-lg font-semibold text-slate-900">৳</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">Budget Manager</p>
              <p className="text-xs text-slate-600">Password reset</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-white/75 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your account email. If reset email is enabled, you’ll receive a link.
            </p>

            {status.type !== "idle" ? (
              <div
                className={[
                  "mt-4 rounded-2xl px-4 py-3 text-sm",
                  status.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                {status.message}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-800">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(sanitizeText(e.target.value, { maxLength: 254 }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 shadow-sm ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-slate-900/25"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Submitting..." : "Request reset"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <Link href="/auth/login" className="font-semibold text-slate-900 hover:underline">
                  Back to login
                </Link>
                <Link href="/auth/register" className="text-slate-600 hover:text-slate-900">
                  Create account
                </Link>
              </div>
            </form>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
              <p className="text-xs font-semibold text-slate-900">If reset email isn’t enabled yet</p>
              <p className="mt-1 text-xs text-slate-600">
                Ask the admin/support to enable password reset, or create a new account if you can’t regain access.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Your data remains private to your account.
          </p>
        </div>
      </div>
    </main>
  );
}
