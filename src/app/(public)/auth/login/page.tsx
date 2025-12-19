
//      TODO: Implement login form (email/password), validation, and route to protected area.


"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { sanitizeEmail, sanitizeText } from "@/shared/security/sanitize";

type FieldErrors = Partial<Record<"email" | "password" | "form", string>>;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-600">
          Loading login...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/app";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) e.email = "Enter a valid email.";

    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";

    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErrors({});

    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    setLoading(true);
    try {
      const safeEmail = sanitizeEmail(email) || email.trim().toLowerCase();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: safeEmail, password }),
      });

      if (!res.ok) {
        const data = (await safeJson(res)) as { message?: string } | null;
        setErrors({ form: data?.message || "Invalid credentials. Please try again." });
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
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

          <Header />

          <div className="mt-6 rounded-3xl bg-white/75 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-600">
              Log in to access your dashboard, analytics, and planning tools.
            </p>

            {errors.form ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.form}
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
                  className={inputClass(!!errors.email)}
                />
                {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">Password</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    type={showPw ? "text" : "password"}
                    className={inputClass(!!errors.password, "pr-12")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}

                <div className="mt-2 flex items-center justify-between">
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Forgot password?
                  </Link>
                  <span className="text-xs text-slate-500">BDT (৳) supported</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
                <span className="ml-2 transition group-hover:translate-x-0.5">→</span>
              </button>

              <p className="text-center text-sm text-slate-600">
                Don’t have an account?{" "}
                <Link href="/auth/register" className="font-semibold text-slate-900 hover:underline">
                  Create one
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Your data is private to your account. No bank integrations.
          </p>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <span className="text-lg font-semibold text-slate-900">৳</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900">Budget Manager</p>
        <p className="text-xs text-slate-600">Login</p>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean, extra?: string) {
  return [
    "mt-2 w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 shadow-sm ring-1 outline-none transition",
    "placeholder:text-slate-400",
    hasError
      ? "ring-red-300 focus:ring-red-400"
      : "ring-black/10 focus:ring-slate-900/25",
    extra || "",
  ].join(" ");
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
