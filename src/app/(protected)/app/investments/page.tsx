import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { ensureInvestmentLifecycleColumns } from "@/server/db/repositories/investments.repo";

export const dynamic = "force-dynamic";

type InvestmentItem = {
  id: string;
  name: string;
  type: string;
  status: "ACTIVE" | "CLOSED";
  latest_value_minor: number;
  final_value_minor: number | null;
  latest_valued_at: string | null;
  closed_at: string | null;
};

async function getInvestments(userId: string): Promise<InvestmentItem[]> {
  await ensureInvestmentLifecycleColumns();

  const res = await db.execute({
    sql: `
      SELECT i.id, i.name, i.type, i.status, i.closed_at, i.final_value_minor, i.currency, i.units, i.note, i.created_at, i.updated_at,
             v.value_minor as latest_value_minor,
             v.valued_at as latest_valued_at
      FROM investments i
      LEFT JOIN investment_values v
        ON v.id = (
          SELECT iv.id FROM investment_values iv
          WHERE iv.investment_id = i.id AND iv.user_id = i.user_id
          ORDER BY datetime(iv.valued_at) DESC, datetime(iv.created_at) DESC
          LIMIT 1
        )
      WHERE i.user_id = ?
      ORDER BY datetime(i.created_at) DESC
    `,
    args: [userId],
  });

  return res.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    status: (row.status as "ACTIVE" | "CLOSED") ?? "ACTIVE",
    latest_value_minor: Number(row.latest_value_minor ?? 0),
    final_value_minor: row.final_value_minor === null || row.final_value_minor === undefined ? null : Number(row.final_value_minor),
    latest_valued_at: row.latest_valued_at ? String(row.latest_valued_at) : null,
    closed_at: row.closed_at ? String(row.closed_at) : null,
  }));
}

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (searchParams?.["new"]) {
    redirect("/app/investments/new");
  }
  const user = await requireUser();
  const list = await getInvestments(user.id);
  const total = list.reduce((s, x) => s + (x.status === "CLOSED" ? x.final_value_minor ?? 0 : x.latest_value_minor), 0);

  return (
    <div className="space-y-6">
      <Header
        title="Investments"
        subtitle="Track portfolio value manually with a clean value-history system."
        right={
          <div className="flex gap-2">
            <Link
              href="/app/investments/new"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Add investment
            </Link>
            <Link
              href="/app/settings"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
            >
              Settings
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Total portfolio" value={formatCurrencyFromMinor(total)} hint="Sum of investments" />
        <KpiCard title="Holdings" value={String(list.length)} hint="Tracked items" />
        <KpiCard title="Currency" value="BDT (৳)" hint="Bangladesh" />
      </div>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Your investments</h2>
          <Link
            href="/app/investments"
            className="text-xs font-semibold text-slate-900 hover:underline"
          >
            Refresh
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((inv) => (
            <Link
              key={inv.id}
              href={`/app/investments/${inv.id}`}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 transition hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{inv.name}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {inv.type} {inv.status === "CLOSED" ? "• Closed" : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrencyFromMinor(inv.status === "CLOSED" ? inv.final_value_minor ?? 0 : inv.latest_value_minor)}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Last updated:{" "}
                {inv.status === "CLOSED"
                  ? inv.closed_at
                    ? formatDate(inv.closed_at)
                    : "Closed"
                  : inv.latest_valued_at
                    ? formatDate(inv.latest_valued_at)
                    : "—"}
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
            </Link>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-600">No investments yet.</p>
            <Link
              href="/app/investments/new"
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Add your first investment
            </Link>
          </div>
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

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
