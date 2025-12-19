import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/db/repositories/accounts.repo";
import { getTransactionById } from "@/server/db/repositories/transactions.repo";

export const dynamic = "force-dynamic";

function safeRedirect(raw?: string | string[]) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const [tx, accounts] = await Promise.all([
    getTransactionById({ userId: user.id, id: params.id }),
    listAccounts(user.id),
  ]);

  if (!tx) return notFound();

  const redirectTo = safeRedirect(searchParams?.redirect) ?? "/app/transactions";

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <Header title="Edit transaction" subtitle="You need at least one account to edit transactions." />
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
      <Header
        title="Edit transaction"
        subtitle="Update amount, category, account, or note."
        right={
          <Link
            href={redirectTo}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            ← Back
          </Link>
        }
      />

      <TransactionForm
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        initialValues={tx}
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
