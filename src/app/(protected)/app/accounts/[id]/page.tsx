import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountForm } from "@/components/forms/AccountForm";
import { EditToggleCard } from "@/components/ui/EditToggleCard";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { getAccount, getAccountBalanceMinor } from "@/server/db/repositories/accounts.repo";
import { listExpenses } from "@/server/db/repositories/expenses.repo";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const account = await getAccount(user.id, params.id);
  if (!account) return notFound();

  const [balanceMinor, txs] = await Promise.all([
    getAccountBalanceMinor(user.id, account.id),
    listExpenses({
      userId: user.id,
      accountId: account.id,
      limit: 50,
      offset: 0,
    }),
  ]);
  const redirectToAccount = `/app/accounts/${account.id}`;

  return (
    <div className="space-y-6">
      <Header
        title={account.name}
        subtitle={`Type: ${account.type} • Balance: ${formatCurrencyFromMinor(balanceMinor ?? 0)}`}
        right={
          <Link
            href="/app/accounts"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            ← Back
          </Link>
        }
      />

      <EditToggleCard title="Edit account" subtitle="Update name or type">
        <div className="max-w-xl">
          <AccountForm
            initialValues={{
              id: account.id,
              name: account.name,
              bank_name: account.bank_name,
              type: account.type,
              currency: account.currency,
              opening_balance_minor: account.opening_balance_minor,
            }}
          />
        </div>
      </EditToggleCard>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Expenses (linked)</h2>
          <Link
            href="/app/expenses/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add expense
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-black/5 text-xs text-slate-500">
                <th className="py-3 pr-3 font-medium">Date</th>
                <th className="py-3 pr-3 font-medium">Type</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 font-medium">Note</th>
                <th className="py-3 text-right font-medium">Amount</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {txs.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-600">
                    No expenses linked to this account yet.
                  </td>
                </tr>
              ) : (
                txs.items.map((tx) => (
                  <tr key={tx.id} className="border-b border-black/5">
                    <td className="py-3 pr-3 text-slate-700">{formatDate(tx.occurred_at)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                          tx.type === "INCOME"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                        ].join(" ")}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-900">{tx.category}</td>
                    <td className="py-3 pr-3 text-slate-600">{tx.note ?? "—"}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {formatCurrencyFromMinor(tx.amount_minor)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/app/transactions/${tx.id}/edit?redirect=${encodeURIComponent(redirectToAccount)}`}
                        className="text-xs font-semibold text-slate-900 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
