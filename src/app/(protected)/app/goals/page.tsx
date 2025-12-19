
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCurrencyFromMinor } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listGoals } from "@/server/db/repositories/goals.repo";

export const dynamic = "force-dynamic";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (searchParams?.["new"]) {
    redirect("/app/goals/new");
  }
  const user = await requireUser();
  const goals = await listGoals(user.id);
  const active = goals.filter((g) => g.status === "ACTIVE");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <Header
        title="Savings goals"
        subtitle="Plan, contribute, and track progress — without clutter."
        right={
          <Link
            href="/app/goals/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add goal
          </Link>
        }
      />

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Active goals</p>
          <p className="text-xs text-slate-600">{active.length} active</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {active.length === 0 ? (
            <EmptyState
              title="No active goals"
              desc="Create a goal like Emergency Fund, Travel, or Education."
              ctaHref="/app/goals/new"
              ctaLabel="Create your first goal"
            />
          ) : (
            active.map((g) => <GoalCard key={g.id} goal={g} />)
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Completed</p>
          <p className="text-xs text-slate-600">{completed.length} completed</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {completed.length === 0 ? (
            <p className="text-sm text-slate-600">No completed goals yet.</p>
          ) : (
            completed.map((g) => <GoalCard key={g.id} goal={g} />)
          )}
        </div>
      </section>
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

function GoalCard({ goal }: { goal: Awaited<ReturnType<typeof listGoals>>[number] }) {
  const pct =
    goal.target_minor <= 0 ? 0 : Math.min(100, Math.round((goal.saved_minor / goal.target_minor) * 100));
  return (
    <Link
      href={`/app/goals/${goal.id}`}
      className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
          <p className="mt-1 text-xs text-slate-600">
            {goal.status === "COMPLETED" ? "Completed" : "Active"}
            {goal.target_date ? ` • Target: ${goal.target_date}` : ""}
          </p>
        </div>
        <span
          className={[
            "inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1",
            goal.status === "COMPLETED"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-900/5 text-slate-700 ring-black/10",
          ].join(" ")}
        >
          {pct}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{formatCurrencyFromMinor(goal.saved_minor)} saved</span>
        <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(goal.target_minor)} target</span>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
    </Link>
  );
}

function EmptyState({
  title,
  desc,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  desc: string;
  ctaHref: string;
  ctaLabel: string;
}) {
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
