import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCurrencyFromMinor } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listLoans } from "@/server/db/repositories/loans.repo";

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (searchParams?.["new"]) {
    redirect("/app/loans/new");
  }
  const user = await requireUser();
  const loans = await listLoans(user.id);
  const totalOutstanding = loans.reduce((s, l) => s + l.outstanding_minor, 0);

  return (
    <div className="space-y-6">
      <Header
        title="Loans"
        subtitle="Track balances, payments, and payoff progress with zero noise."
        right={
          <Link
            href="/app/loans/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add loan
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Total outstanding" value={formatCurrencyFromMinor(totalOutstanding)} hint="All active loans" />
        <KpiCard title="Loans tracked" value={String(loans.length)} hint="Accounts are private" />
        <KpiCard title="Currency" value="BDT (৳)" hint="Bangladesh" />
      </div>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Your loans</p>
          <p className="text-xs text-slate-600">Click to open details</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {loans.length === 0 ? (
            <EmptyState
              title="No loans yet"
              desc="Add loans to track payoff progress and reduce financial stress."
              ctaHref="/app/loans/new"
              ctaLabel="Add a loan"
            />
          ) : (
            loans.map((l) => <LoanCard key={l.id} loan={l} />)
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- UI ---------- */

function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </div>
  );
}

function LoanCard({ loan }: { loan: Awaited<ReturnType<typeof listLoans>>[number] }) {
  const paid = Math.max(0, loan.principal_minor - loan.outstanding_minor);
  const pct = loan.principal_minor <= 0 ? 0 : Math.min(100, Math.round((paid / loan.principal_minor) * 100));

  return (
    <Link
      href={`/app/loans/${loan.id}`}
      className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{loan.lender}</p>
          <p className="mt-1 text-xs text-slate-600">
            Principal {formatCurrencyFromMinor(loan.principal_minor)} • Outstanding {formatCurrencyFromMinor(loan.outstanding_minor)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {loan.interest_rate != null ? `Interest: ${loan.interest_rate}%` : "Interest: —"}
            {loan.start_date ? ` • Start: ${loan.start_date}` : ""}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">
          {pct}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{formatCurrencyFromMinor(paid)} paid</span>
        <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(loan.outstanding_minor)} left</span>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
    </Link>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function EmptyState({ title, desc, ctaHref, ctaLabel }: { title: string; desc: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      <Link href={ctaHref} className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
        {ctaLabel}
      </Link>
    </div>
  );
}
