import { ReceivableForm } from "@/components/forms/ReceivableForm";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewReceivablePage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <Header title="Add receivable" subtitle="Record money someone will pay you back." />
      <ReceivableForm redirectTo="/app/receivables" />
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
