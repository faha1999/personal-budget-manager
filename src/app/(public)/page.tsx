
  //    TODO: Build the optional landing page describing Budget Manager for Bangladesh users.


import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function PublicLandingPage() {
  return (
    <main className="relative min-h-screen bg-app text-ink">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <span className="text-lg font-semibold text-slate-900">৳</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Budget Manager</p>
              <p className="text-xs text-slate-600">Bangladesh • Personal Finance</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <ThemeToggle size="sm" variant="ghost" showLabel={false} />
            <Link
              href="/auth/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/50 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Create account
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/5 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built for daily money clarity in Bangladesh
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Track spending, grow savings, and plan your financial freedom.
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Log income and expenses in seconds, manage bank accounts and investments,
              set savings goals, track loans, and explore Sharia profit sharing + FIRE planning —
              all in one clean dashboard.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Get started
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-xl bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-black/5 hover:bg-white"
              >
                I already have an account
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <FeaturePill title="Daily tracking" desc="Income & expense logging" />
              <FeaturePill title="Analytics" desc="Charts & summaries" />
              <FeaturePill title="Tools" desc="Sharia + FIRE" />
            </div>
          </div>

          {/* Showcase card */}
          <div className="relative">
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-pink-500/10 blur-2xl" />
            <div className="relative rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">This month</p>
                <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-medium text-slate-700">
                  BDT (৳)
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <StatCard label="Income" value="৳ 85,000" hint="+12% vs last month" />
                <StatCard label="Expense" value="৳ 46,300" hint="Food, Rent, Transport" />
                <StatCard label="Savings" value="৳ 38,700" hint="On track ✔" />
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <p className="text-xs font-medium text-slate-600">Highlights</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li className="flex items-center justify-between">
                    <span className="truncate">Top category</span>
                    <span className="font-semibold text-slate-900">Food</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="truncate">Net worth trend</span>
                    <span className="font-semibold text-emerald-600">Up</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="truncate">FIRE estimate</span>
                    <span className="font-semibold text-slate-900">~14.5 yrs</span>
                  </li>
                </ul>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                Note: This preview is illustrative. Your dashboard will reflect your real data after login.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-black/5 pt-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              © {new Date().getFullYear()} Budget Manager. Personal finance tracking — no bank integrations.
            </p>
            <a
              href="https://github.com/faha1999"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Build with ♥ by Faha 
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeaturePill({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 backdrop-blur">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
