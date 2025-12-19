import Link from "next/link";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/db/repositories/accounts.repo";
import { listTransactions } from "@/server/db/repositories/transactions.repo";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function parsePage(searchParams: Record<string, string | string[] | undefined>) {
  const p = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const n = Number(p || "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toISODate(value: string | null | undefined, endOfDay?: boolean) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function buildQuery(
  searchParams: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | number | undefined>
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (overrides[k] !== undefined) continue;
    const val = firstValue(v);
    if (val) qs.set(k, val);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) continue;
    qs.set(k, String(v));
  }
  return qs.toString();
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const page = parsePage(searchParams);
  const [accounts, tx] = await Promise.all([
    listAccounts(user.id),
    listTransactions({
      userId: user.id,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      start: toISODate(firstValue(searchParams.from)),
      end: toISODate(firstValue(searchParams.to), true),
      type: firstValue(searchParams.type) as "INCOME" | "EXPENSE" | undefined,
      category: firstValue(searchParams.category) || undefined,
      accountId: firstValue(searchParams.account) || undefined,
    }),
  ]);

  const accountLookup = new Map(accounts.map((a) => [a.id, a.name]));
  const totalPages = Math.max(1, Math.ceil(tx.total / PAGE_SIZE));
  const currentQuery = buildQuery(searchParams, { page });
  const redirectPath = currentQuery ? `/app/transactions?${currentQuery}` : "/app/transactions";

  return (
    <div className="space-y-6">
      <Header
        title="Transactions"
        subtitle="Filter by date range, type, category, and account. Keep it clean."
        right={
          <Link
            href="/app/transactions/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add transaction
          </Link>
        }
      />

      <FilterBar accounts={accounts} searchParams={searchParams} />

      <section className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Results</p>
          <p className="text-xs text-slate-600">
            {tx.total} total • page {page} of {totalPages}
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-black/5 text-xs text-slate-500">
                <th className="py-3 pr-3 font-medium">Date</th>
                <th className="py-3 pr-3 font-medium">Type</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 font-medium">Account</th>
                <th className="py-3 pr-3 font-medium">Note</th>
                <th className="py-3 text-right font-medium">Amount</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tx.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-600">
                    No transactions found.{" "}
                    <Link href="/app/transactions/new" className="font-semibold text-slate-900 hover:underline">
                      Add one →
                    </Link>
                  </td>
                </tr>
              ) : (
                tx.items.map((t) => (
                  <tr key={t.id} className="border-b border-black/5">
                    <td className="py-3 pr-3 text-slate-700">{formatDate(t.occurred_at)}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                          t.type === "INCOME"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                        ].join(" ")}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-900">{t.category}</td>
                    <td className="py-3 pr-3 text-slate-700">{accountLookup.get(t.account_id) ?? "—"}</td>
                    <td className="py-3 pr-3 text-slate-600">{t.note ?? "—"}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {formatCurrencyFromMinor(t.amount_minor)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/app/transactions/${t.id}/edit?redirect=${encodeURIComponent(redirectPath)}`}
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

        <Pagination page={page} totalPages={totalPages} query={(overrides) => buildQuery(searchParams, overrides)} />
      </section>
    </div>
  );
}

function FilterBar({
  accounts,
  searchParams,
}: {
  accounts: Awaited<ReturnType<typeof listAccounts>>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = {
    from: firstValue(searchParams.from) ?? "",
    to: firstValue(searchParams.to) ?? "",
    type: firstValue(searchParams.type) ?? "",
    category: firstValue(searchParams.category) ?? "",
    account: firstValue(searchParams.account) ?? "",
  };

  return (
    <section className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-6">
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="From">
          <input name="from" type="date" defaultValue={current.from} className={input()} />
        </Field>
        <Field label="To">
          <input name="to" type="date" defaultValue={current.to} className={input()} />
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={current.type} className={input()}>
            <option value="">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </Field>
        <Field label="Category">
          <input name="category" placeholder="e.g. Food" defaultValue={current.category} className={input()} />
        </Field>
        <Field label="Account">
          <select name="account" defaultValue={current.account} className={input()}>
            <option value="">All</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Apply
          </button>
          <a
            href="/app/transactions"
            className="w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            Reset
          </a>
        </div>
      </form>
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  query,
}: {
  page: number;
  totalPages: number;
  query: (overrides: Record<string, string | number | undefined>) => string;
}) {
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Link
        href={`/app/transactions?${query({ page: prev })}`}
        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
      >
        ← Prev
      </Link>
      <p className="text-xs text-slate-600">
        Page <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
      </p>
      <Link
        href={`/app/transactions?${query({ page: next })}`}
        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
      >
        Next →
      </Link>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function input() {
  return "w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 ring-1 ring-black/10 outline-none transition placeholder:text-slate-400 focus:ring-slate-900/25";
}
