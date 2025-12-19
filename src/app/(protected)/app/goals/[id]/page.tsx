import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalForm } from "@/components/forms/GoalForm";
import { GoalContributionForm } from "@/components/forms/GoalContributionForm";
import { EditToggleCard } from "@/components/ui/EditToggleCard";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { getGoal, listGoalContributions } from "@/server/db/repositories/goals.repo";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const goal = await getGoal(user.id, params.id);
  if (!goal) return notFound();

  const contributions = await listGoalContributions({
    userId: user.id,
    goalId: goal.id,
    limit: 50,
    offset: 0,
  });

  const pct =
    goal.target_minor <= 0 ? 0 : Math.min(100, Math.round((goal.saved_minor / goal.target_minor) * 100));
  const remaining = Math.max(0, goal.target_minor - goal.saved_minor);

  return (
    <div className="space-y-6">
      <Header
        title={goal.title}
        subtitle={`${goal.status} • Target ${formatCurrencyFromMinor(goal.target_minor)} • Saved ${formatCurrencyFromMinor(goal.saved_minor)}`}
        right={
          <Link
            href="/app/goals"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            ← Back
          </Link>
        }
      />

      <EditToggleCard title="Edit goal" subtitle="Rename, adjust target, or mark complete">
        <div className="max-w-xl">
          <GoalForm
            initialValues={{
              id: goal.id,
              title: goal.title,
              target_minor: goal.target_minor,
              target_date: goal.target_date,
              note: goal.note,
              status: goal.status,
            }}
          />
        </div>
      </EditToggleCard>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Progress</p>
            <p className="mt-1 text-sm text-slate-600">
              {pct}% complete • Remaining:{" "}
              <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(remaining)}</span>
              {goal.target_date ? ` • Target date: ${goal.target_date}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <GoalContributionForm goalId={goal.id} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contributions" subtitle="Manual contributions history">
          <Table2
            columns={["Date", "Note", "Amount"]}
            rows={contributions.items.map((c) => [
              formatDate(c.contributed_at),
              c.note ?? "—",
              formatCurrencyFromMinor(c.amount_minor),
            ])}
          />
        </Card>

        <Card title="Related transactions" subtitle="If goal is linked to transactions/categories">
          <p className="text-sm text-slate-600">
            No linked transactions yet. (Optional feature) Link savings category transactions to auto-update goal.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------- UI ---------- */

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

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table2({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-black/5">
      <table className="w-full min-w-[520px] bg-white text-left">
        <thead>
          <tr className="border-b border-black/5 text-xs text-slate-500">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-600">
                No data.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={idx} className="border-b border-black/5 last:border-none">
                {r.map((cell, i) => (
                  <td key={i} className={["px-4 py-3", i === r.length - 1 ? "text-right font-semibold text-slate-900" : "text-slate-700"].join(" ")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
