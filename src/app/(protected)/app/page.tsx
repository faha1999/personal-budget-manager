import Link from "next/link";
import { formatCurrencyFromMinor } from "@/lib/format";
import { startOfMonth, endOfMonth } from "@/lib/date";
import { requireUser } from "@/server/auth/guards";
import { categoriesForDashboard, summaryForDashboard, trendsForDashboard } from "@/server/services/analytics.service";
import { listGoals } from "@/server/db/repositories/goals.repo";
import { db } from "@/server/db/client";
import { ensureInvestmentLifecycleColumns } from "@/server/db/repositories/investments.repo";
import { CATEGORY_COLORS } from "@/shared/constants/categories";
import { BudgetVisuals } from "@/components/dashboard/BudgetVisuals";
import { PortfolioSnapshot } from "@/components/dashboard/PortfolioSnapshot";

export const dynamic = "force-dynamic";

type TrendPoint = { label: string; income: number; expense: number };
type CategorySlice = { name: string; amount: number };

async function getDashboardData(userId: string): Promise<{
  kpis: { income: number; expense: number; savings: number; netWorth: number };
  trends: TrendPoint[];
  categories: CategorySlice[];
  goals: { title: string; target: number; saved: number }[];
  portfolio: {
    total: number;
    realizedGain: number;
    holdings: { id: string; name: string; type: string; status: "ACTIVE" | "CLOSED"; value: number }[];
    trend: { day: string; total: number }[];
  };
}> {
  const now = new Date();
  const start = startOfMonth(now).toISOString();
  const end = endOfMonth(now).toISOString();

  const [summary, trends, categories, goals] = await Promise.all([
    summaryForDashboard({ userId, start, end }),
    trendsForDashboard({
      userId,
      start: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 4, 1)).toISOString(),
      end,
      granularity: "month",
    }),
    categoriesForDashboard({ userId, start, end, type: "EXPENSE" }),
    listGoals(userId),
  ]);

  const portfolio = await getPortfolioSnapshot(userId);

  return {
    kpis: {
      income: summary.income_minor,
      expense: summary.expense_minor,
      savings: summary.savings_minor,
      netWorth: summary.net_worth_minor,
    },
    trends: trends.series.map((t) => ({
      label: t.bucket,
      income: t.income_minor,
      expense: t.expense_minor,
    })),
    categories: categories.map((c) => ({ name: c.category, amount: c.total_minor })),
    goals: goals.slice(0, 4).map((g) => ({
      title: g.title,
      target: g.target_minor,
      saved: g.saved_minor,
    })),
    portfolio,
  };
}

async function getPortfolioSnapshot(userId: string): Promise<{
  total: number;
  realizedGain: number;
  holdings: { id: string; name: string; type: string; status: "ACTIVE" | "CLOSED"; value: number }[];
  trend: { day: string; total: number }[];
}> {
  await ensureInvestmentLifecycleColumns();

  const res = await db.execute({
    sql: `
      SELECT i.id, i.name, i.type, i.status, i.closed_at, i.final_value_minor, i.realized_gain_minor,
             v.value_minor as latest_value_minor, v.valued_at as latest_valued_at
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
      LIMIT 25
    `,
    args: [userId],
  });

  let realizedGain = 0;
  const holdings = (res.rows as any[]).map((r) => {
    const status = (r.status as "ACTIVE" | "CLOSED") ?? "ACTIVE";
    const realized = Number(r.realized_gain_minor ?? 0);
    realizedGain += realized;
    const value =
      status === "CLOSED"
        ? Number(r.final_value_minor ?? 0)
        : Number(r.latest_value_minor ?? r.final_value_minor ?? 0);
    return {
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      status,
      value,
      closed_at: r.closed_at ? String(r.closed_at) : null,
    };
  });

  const total = holdings.reduce((s, h) => s + h.value, 0);

  const trendMap = new Map<string, number>();
  const valueRows = await db.execute({
    sql: `
      SELECT date(valued_at) as day, SUM(value_minor) as total_minor
      FROM investment_values
      WHERE user_id = ?
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `,
    args: [userId],
  });
  for (const row of valueRows.rows as any[]) {
    trendMap.set(String(row.day), Number(row.total_minor ?? 0));
  }
  // incorporate closed final values so they appear on the chart
  for (const h of holdings) {
    if (h.status === "CLOSED" && (h as any).closed_at) {
      const day = String((h as any).closed_at).slice(0, 10);
      trendMap.set(day, (trendMap.get(day) ?? 0) + h.value);
    }
  }

  const trend = Array.from(trendMap.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-12);

  return {
    total,
    realizedGain,
    holdings: holdings.slice(0, 6),
    trend,
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your monthly overview, trends, and progress — designed for clarity."
        actions={
          <div className="flex gap-2">
            <Link
              href="/app/expenses/new"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Add expense
            </Link>
            <Link
              href="/app/expenses"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
            >
              View all
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Income (month)" value={formatCurrencyFromMinor(data.kpis.income)} hint="Total credited" />
        <KpiCard title="Expense (month)" value={formatCurrencyFromMinor(data.kpis.expense)} hint="Total spent" />
        <KpiCard title="Savings (month)" value={formatCurrencyFromMinor(data.kpis.savings)} hint="Income − Expense" />
        <KpiCard
          title="Net worth"
          value={formatCurrencyFromMinor(data.kpis.netWorth)}
          hint="Assets − Liabilities"
          tone={data.kpis.netWorth >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Budget overview" subtitle="Quick glance at income, spend, and savings rate">
          <BudgetOverview
            income={data.kpis.income}
            expense={data.kpis.expense}
            savings={data.kpis.savings}
          />
        </Card>

        <Card title="Expense breakdown" subtitle="Top categories for this month">
          <ExpenseBreakdown categories={data.categories} />
        </Card>
      </div>

      <Card title="Visual budget snapshots" subtitle="Bars, lines, donut, and flow view of your money">
        <BudgetVisuals trends={data.trends} categories={data.categories} kpis={data.kpis} />
      </Card>

      <PortfolioSnapshot
        total={data.portfolio.total}
        realizedGain={data.portfolio.realizedGain}
        holdings={data.portfolio.holdings}
        trend={data.portfolio.trend}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Income vs Expense (last 5 months)" subtitle="A quick visual trend">
          <MiniBars data={data.trends} />
        </Card>

        <Card title="Expense by category (this month)" subtitle="Where your money went">
          <CategoryList categories={data.categories} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Savings goals" subtitle="Progress toward what matters">
          <div className="space-y-3">
            {data.goals.map((g) => {
              const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              return (
                <div key={g.title} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{g.title}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {formatCurrencyFromMinor(g.saved)} / {formatCurrencyFromMinor(g.target)}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{pct}% complete</p>
                </div>
              );
            })}
            <Link
              href="/app/goals"
              className="inline-flex text-sm font-semibold text-slate-900 hover:underline"
            >
              Manage goals →
            </Link>
          </div>
        </Card>

        <Card title="Planning tools" subtitle="Calculate smarter decisions">
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolLink
              href="/app/tools/compound-interest"
              title="Compound Interest"
              desc="Future value, interest earned"
            />
            <ToolLink
              href="/app/tools/fire"
              title="FIRE Calculator"
              desc="Estimate time to independence"
            />
            <ToolLink href="/app/accounts" title="Accounts" desc="Cash + bank overview" />
            <ToolLink href="/app/investments" title="Investments" desc="Portfolio tracking" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KpiCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-slate-900";

  return (
    <div className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ToolLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 transition hover:bg-white"
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
    </Link>
  );
}

function BudgetOverview({
  income,
  expense,
  savings,
}: {
  income: number;
  expense: number;
  savings: number;
}) {
  const max = Math.max(income, expense, Math.abs(savings), 1);
  const savingsRate = income === 0 ? 0 : Math.round(((income - expense) / income) * 100);
  const spendUsage = income === 0 ? 0 : Math.round((expense / income) * 100);
  const daysThisMonth = endOfMonth(new Date()).getDate();
  const burnPerDay = expense / Math.max(1, daysThisMonth);

  const rows = [
    { label: "Income", value: income, color: "bg-emerald-500" },
    { label: "Expense", value: expense, color: "bg-rose-500" },
    { label: "Savings", value: savings, color: "bg-slate-900" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((r) => {
          const width = Math.min(100, Math.round((Math.abs(r.value) / max) * 100));
          return (
            <div key={r.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">{r.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 ring-1 ring-black/5">
                <div className={`h-full ${r.color}`} style={{ width: `${width}%` }} />
              </div>
              <span className="text-sm font-semibold text-slate-900">{formatCurrencyFromMinor(Math.abs(r.value))}</span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <StatPill
          label="Savings rate"
          value={`${savingsRate}%`}
          hint="(income − expense) / income"
          tone={savingsRate >= 0 ? "positive" : "negative"}
        />
        <StatPill
          label="Spend vs income"
          value={`${spendUsage}%`}
          hint="of income used"
          tone={spendUsage <= 100 ? "positive" : "negative"}
        />
        <StatPill
          label="Avg daily spend"
          value={formatCurrencyFromMinor(Math.round(burnPerDay))}
          hint="this month"
        />
        <StatPill
          label="Net change"
          value={formatCurrencyFromMinor(savings)}
          hint={savings >= 0 ? "Growing" : "Shrinking"}
          tone={savings >= 0 ? "positive" : "negative"}
        />
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "negative"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-slate-50 text-slate-800 ring-black/5";

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${toneClass}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      {hint ? <p className="text-[11px] text-slate-600">{hint}</p> : null}
    </div>
  );
}

function ExpenseBreakdown({ categories }: { categories: CategorySlice[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-slate-600">No expenses recorded this month.</p>;
  }

  const total = categories.reduce((s, c) => s + c.amount, 0) || 1;
  const top = categories.slice(0, 4);
  const used = top.reduce((s, c) => s + c.amount, 0);
  const segments =
    total - used > 0
      ? [...top, { name: "Other", amount: total - used }]
      : top;

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 ring-1 ring-black/5">
        {segments.map((seg, idx) => (
          <div
            key={seg.name}
            className="h-full"
            style={{
              width: `${Math.max(6, Math.round((seg.amount / total) * 100))}%`,
              backgroundColor: colorForCategory(seg.name, idx),
            }}
            title={`${seg.name}: ${formatCurrencyFromMinor(seg.amount)} (${Math.round((seg.amount / total) * 100)}%)`}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {segments.map((seg, idx) => {
          const pct = Math.round((seg.amount / total) * 100);
          return (
            <div
              key={seg.name}
              className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colorForCategory(seg.name, idx) }}
                  />
                  <p className="text-sm font-semibold text-slate-900">{seg.name}</p>
                </div>
                <span className="text-xs font-semibold text-slate-700">{pct}%</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{formatCurrencyFromMinor(seg.amount)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FALLBACK_COLORS = ["#0ea5e9", "#f97316", "#10b981", "#6366f1", "#f43f5e", "#14b8a6"];

function colorForCategory(name: string, index: number) {
  return CATEGORY_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function MiniBars({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{d.label}</p>
            <p className="text-xs text-slate-600">
              Income {money(d.income)} • Expense {money(d.expense)}
            </p>
          </div>
          <div className="mt-3 grid gap-2">
            <BarRow label="Income" value={d.income} max={max} />
            <BarRow label="Expense" value={d.expense} max={max} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs font-medium text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
      </div>
      <span className="w-20 text-right text-xs font-semibold text-slate-900">{money(value)}</span>
    </div>
  );
}

function CategoryList({ categories }: { categories: CategorySlice[] }) {
  const total = categories.reduce((s, c) => s + c.amount, 0) || 1;
  return (
    <div className="space-y-3">
      {categories.map((c) => {
        const pct = Math.round((c.amount / total) * 100);
        return (
          <div key={c.name} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
              <p className="text-xs font-semibold text-slate-900">{money(c.amount)}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-600">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

function money(n: number) {
  return formatCurrencyFromMinor(n);
}
