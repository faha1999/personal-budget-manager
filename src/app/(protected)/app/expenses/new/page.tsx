import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/db/repositories/accounts.repo";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id);

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <Header
          title="New expense"
          subtitle="You need at least one account to log expenses."
        />
        <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <p className="text-sm text-slate-700">
            No accounts found. Please create an account first.
          </p>
          <a
            href="/app/accounts"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Go to Accounts
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="New expense"
        subtitle="Fast entry, mobile-friendly."
      />
      <ExpenseForm accounts={accounts} redirectTo="/app/expenses" />
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}
