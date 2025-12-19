import { GoalForm } from "@/components/forms/GoalForm";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <Header title="Create goal" subtitle="Set a target and track progress with contributions." />
      <GoalForm redirectTo="/app/goals" />
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
