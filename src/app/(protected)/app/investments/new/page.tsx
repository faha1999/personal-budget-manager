import { InvestmentForm } from "@/components/forms/InvestmentForm";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewInvestmentPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <Header title="Add investment" subtitle="Track holdings and optional initial value." />
      <InvestmentForm redirectTo="/app/investments" />
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
