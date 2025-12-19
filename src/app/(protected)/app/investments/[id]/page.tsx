import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { EditToggleCard } from "@/components/ui/EditToggleCard";
import { InvestmentForm } from "@/components/forms/InvestmentForm";
import { InvestmentValueForm } from "@/components/forms/InvestmentValueForm";
import { getInvestment, listInvestmentValues } from "@/server/db/repositories/investments.repo";

export const dynamic = "force-dynamic";

export default async function InvestmentDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const inv = await getInvestment(user.id, params.id);
  if (!inv) return notFound();

  const values = await listInvestmentValues({ userId: user.id, investmentId: inv.id, limit: 50 });
  const history = [...values].reverse(); // oldest -> newest for chart/table
  const latest = values[0]?.value_minor ?? 0;
  const initialValue = history[0];
  const isClosed = inv.status === "CLOSED";
  const displayValue = isClosed && inv.final_value_minor != null ? inv.final_value_minor : latest;

  return (
    <div className="space-y-6">
      <Header
        title={inv.name}
        subtitle={`${inv.type} • ${isClosed ? "Closed value" : "Latest value"}: ${formatCurrencyFromMinor(displayValue)}`}
        right={
          <Link
            href="/app/investments"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            ← Back
          </Link>
        }
      />

      <EditToggleCard title="Edit investment" subtitle="Name, type, or units">
        <div className="max-w-xl">
          <InvestmentForm
            initialValues={{
              id: inv.id,
              name: inv.name,
              type: inv.type,
              units: inv.units,
              note: inv.note,
              status: inv.status as "ACTIVE" | "CLOSED",
              closedAt: inv.closed_at ?? null,
              finalValueMinor: inv.final_value_minor ?? null,
              realizedGainMinor: inv.realized_gain_minor ?? null,
              initialValueMinor: initialValue?.value_minor ?? null,
              initialValuedAt: initialValue?.valued_at ?? null,
            }}
          />
        </div>
      </EditToggleCard>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Value history</h2>
            <p className="mt-1 text-xs text-slate-600">
              Latest values are stored in Turso and reflected here. {isClosed ? "Investment is closed." : ""}
            </p>
          </div>
        </div>

        {isClosed ? (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
            Closed on {inv.closed_at ? formatDate(inv.closed_at) : "—"} with final value{" "}
            {formatCurrencyFromMinor(inv.final_value_minor ?? 0)} and realized{" "}
            {formatCurrencyFromMinor(inv.realized_gain_minor ?? 0)}.
          </div>
        ) : (
          <div className="mt-4">
            <InvestmentValueForm investmentId={inv.id} />
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <Sparkline points={history.map((h) => h.value_minor)} />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">
              {history[0]?.valued_at ? formatDate(history[0].valued_at) : "—"}
            </span>
            <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(latest)}</span>
            <span className="font-medium text-slate-600">
              {history.at(-1)?.valued_at ? formatDate(history.at(-1)!.valued_at) : "—"}
            </span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-black/5 text-xs text-slate-500">
                <th className="py-3 pr-3 font-medium">Date</th>
                <th className="py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {history.map((h) => (
                <tr key={h.id} className="border-b border-black/5">
                  <td className="py-3 pr-3 text-slate-700">{formatDate(h.valued_at)}</td>
                  <td className="py-3 text-right font-semibold text-slate-900">
                    {formatCurrencyFromMinor(h.value_minor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inv.note ? (
          <p className="mt-4 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Note:</span> {inv.note}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
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

function Sparkline({ points }: { points: number[] }) {
  const w = 600;
  const h = 120;
  const pad = 10;

  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);

  const scaleX = (i: number) => (i / Math.max(points.length - 1, 1)) * (w - pad * 2) + pad;
  const scaleY = (v: number) => {
    const t = (v - min) / Math.max(max - min, 1);
    return h - pad - t * (h - pad * 2);
  };

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-900" />
      <path
        d={`${d} L ${scaleX(points.length - 1)} ${h - pad} L ${scaleX(0)} ${h - pad} Z`}
        fill="currentColor"
        className="text-slate-900/10"
      />
    </svg>
  );
}
