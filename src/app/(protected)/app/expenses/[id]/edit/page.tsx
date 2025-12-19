import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/db/repositories/accounts.repo";
import { getExpenseById } from "@/server/db/repositories/expenses.repo";

export const dynamic = "force-dynamic";

function safeRedirect(raw?: string | string[]) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const [ex, accounts] = await Promise.all([
    getExpenseById({ userId: user.id, id: params.id }),
    listAccounts(user.id),
  ]);

  if (!ex) return notFound();

  const redirectTo = safeRedirect(searchParams?.redirect) ?? "/app/expenses";

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <Header title="Edit expense" subtitle="You need at least one account to edit expenses." />
        <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <p className="text-sm text-slate-700">No accounts found. Please create an account first.</p>
          <Link
            href="/app/accounts"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Go to Accounts
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={redirectTo} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Back
        </Link>
        <Header title="Edit expense" />
      </div>
      <ExpenseForm
        accounts={accounts}
        initialValues={{
          id: ex.id,
          account_id: ex.account_id,
          type: ex.type,
          category: ex.category,
          note: ex.note,
          amount_minor: ex.amount_minor,
          occurred_at: ex.occurred_at,
        }}
        redirectTo={redirectTo}
      />
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
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
