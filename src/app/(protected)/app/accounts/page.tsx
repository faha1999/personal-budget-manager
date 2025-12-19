import Link from "next/link";
import { AccountForm } from "@/components/forms/AccountForm";
import { formatCurrencyFromMinor } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

type AccountWithBalance = {
  id: string;
  name: string;
  bank_name: string | null;
  type: string;
  balance_minor: number;
  currency: string;
};

async function getAccounts(userId: string): Promise<AccountWithBalance[]> {
  const res = await db().execute({
    sql: `
      SELECT
        a.id,
        a.name,
        a.bank_name,
        a.type,
        a.currency,
        a.opening_balance_minor,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_minor ELSE 0 END), 0) AS income_minor,
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_minor ELSE 0 END), 0) AS expense_minor
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY datetime(a.created_at) DESC
    `,
    args: [userId],
  });

  return res.rows.map((row: any) => {
    const opening = Number(row.opening_balance_minor ?? 0);
    const income = Number(row.income_minor ?? 0);
    const expense = Number(row.expense_minor ?? 0);
    return {
      id: String(row.id),
      name: String(row.name),
      bank_name: row.bank_name ? String(row.bank_name) : null,
      type: String(row.type),
      currency: String(row.currency),
      balance_minor: opening + income - expense,
    };
  });
}

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccounts(user.id);
  const total = accounts.reduce((s, a) => s + a.balance_minor, 0);

  return (
    <div className="space-y-6">
      <Header
        title="Accounts"
        subtitle="Your money locations — clean overview for confident decisions."
        right={
          <Link
            href="/app/settings"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            Manage settings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Total balance" value={formatCurrencyFromMinor(total)} hint="Bank + Cash" />
        <KpiCard title="Accounts" value={String(accounts.length)} hint="Active accounts" />
        <KpiCard title="Currency" value="BDT (৳)" hint="Bangladesh" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Your accounts</h2>
            <p className="text-xs text-slate-600">Click to view details</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/app/accounts/${a.id}`}
                className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 transition hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                    <p className="mt-1 text-xs text-slate-600">{a.type}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrencyFromMinor(a.balance_minor)}
                  </p>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-900">Open →</p>
              </Link>
            ))}
          </div>

          {accounts.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">No accounts yet.</p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900">Add account</h2>
          <p className="text-xs text-slate-600">Cash, Bank, or Mobile Wallet</p>
          <div className="mt-4">
            <AccountForm />
          </div>
        </section>
      </div>
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

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
