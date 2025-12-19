import Link from "next/link";
import { formatCurrencyFromMinor } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listReceivables } from "@/server/db/repositories/receivables.repo";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const user = await requireUser();
  const receivables = await listReceivables(user.id);
  const totalOutstanding = receivables.reduce((s, r) => s + r.outstanding_minor, 0);

  return (
    <div className="space-y-6">
      <Header
        title="Receivables"
        subtitle="Money others owe you — counts toward net worth."
        right={
          <Link
            href="/app/receivables/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add receivable
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Outstanding" value={formatCurrencyFromMinor(totalOutstanding)} hint="Expected back" />
        <KpiCard title="People owing" value={String(receivables.length)} hint="Active receivables" />
        <KpiCard title="Currency" value="BDT (৳)" hint="Bangladesh" />
      </div>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Receivables</p>
          <p className="text-xs text-slate-600">Click to open details</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {receivables.length === 0 ? (
            <EmptyState
              title="No receivables yet"
              desc="Record money friends or family owe you to track payback."
              ctaHref="/app/receivables/new"
              ctaLabel="Add receivable"
            />
          ) : (
            receivables.map((r) => <ReceivableCard key={r.id} receivable={r} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ReceivableCard({ receivable }: { receivable: Awaited<ReturnType<typeof listReceivables>>[number] }) {
  const paid = Math.max(0, receivable.principal_minor - receivable.outstanding_minor);
  const pct = receivable.principal_minor <= 0 ? 0 : Math.min(100, Math.round((paid / receivable.principal_minor) * 100));

  return (
    <Link
      href={`/app/receivables/${receivable.id}`}
      className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{receivable.person}</p>
          <p className="mt-1 text-xs text-slate-600">
            Principal {formatCurrencyFromMinor(receivable.principal_minor)} • Outstanding {formatCurrencyFromMinor(receivable.outstanding_minor)}
          </p>
          <p className="mt-1 text-xs text-slate-600">{receivable.start_date ? `Started: ${receivable.start_date}` : "No date set"}</p>
        </div>
        <span className="inline-flex rounded-full bg-emerald-900/5 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {pct}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{formatCurrencyFromMinor(paid)} received</span>
        <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(receivable.outstanding_minor)} left</span>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
    </Link>
  );
}

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
      <Link
        href={ctaHref}
        className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
