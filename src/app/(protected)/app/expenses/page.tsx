import Link from "next/link";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/db/repositories/accounts.repo";
import { listExpenses } from "@/server/db/repositories/expenses.repo";

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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const page = parsePage(searchParams);
  const [accounts, ex] = await Promise.all([
    listAccounts(user.id),
    listExpenses({
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
  const totalPages = Math.max(1, Math.ceil(ex.total / PAGE_SIZE));
  const currentQuery = buildQuery(searchParams, { page });
  const redirectPath = currentQuery ? `/app/expenses?${currentQuery}` : "/app/expenses";

  return (
    <div className="space-y-6">
      <Header
        title="Expenses"
        subtitle="Filter by date range, type, category, and account. Keep it clean."
        right={
          <Link
            href="/app/expenses/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Add expense
          </Link>
        }
      />

      <FilterBar accounts={accounts} searchParams={searchParams} />

      <section className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Results</p>
          <p className="text-xs text-slate-600">
            {ex.total} total • page {page} of {totalPages}
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
              {ex.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-600">
                    No expenses found.{" "}
                    <Link href="/app/expenses/new" className="font-semibold text-slate-900 hover:underline">
                      Add one →
                    </Link>
                  </td>
                </tr>
              ) : (
                ex.items.map((t) => (
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
                        href={`/app/expenses/${t.id}/edit?redirect=${encodeURIComponent(redirectPath)}`}
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

function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
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

function FilterBar({
  accounts,
  searchParams,
}: {
  accounts: Array<{ id: string; name: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const currentType = firstValue(searchParams.type);
  const currentCategory = firstValue(searchParams.category);
  const currentAccount = firstValue(searchParams.account);

  return (
    <section className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-6">
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-semibold text-slate-900">
            From
          </label>
          <input
            type="date"
            id="from"
            name="from"
            className="input"
            defaultValue={firstValue(searchParams.from) || ""}
          />
        </div>

        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-semibold text-slate-900">
            To
          </label>
          <input
            type="date"
            id="to"
            name="to"
            className="input"
            defaultValue={firstValue(searchParams.to) || ""}
          />
        </div>

        <div>
          <label htmlFor="type" className="mb-1 block text-xs font-semibold text-slate-900">
            Type
          </label>
          <select id="type" name="type" className="input" defaultValue={currentType || ""}>
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-semibold text-slate-900">
            Category
          </label>
          <input
            id="category"
            name="category"
            className="input"
            placeholder="e.g. Food"
            defaultValue={currentCategory || ""}
          />
        </div>

        <div>
          <label htmlFor="account" className="mb-1 block text-xs font-semibold text-slate-900">
            Account
          </label>
          <select id="account" name="account" className="input" defaultValue={currentAccount || ""}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Apply
          </button>
          <a
            href="/app/expenses"
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
  const prevHref = page > 1 ? `/app/expenses?${query({ page: page - 1 })}` : null;
  const nextHref = page < totalPages ? `/app/expenses?${query({ page: page + 1 })}` : null;

  return (
    <div className="mt-6 flex items-center justify-between">
      {prevHref ? (
        <Link
          href={prevHref}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
        >
          ← Back
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-400">
          ← Back
        </span>
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={query({ page: p }) ? `/app/expenses?${query({ page: p })}` : "/app/expenses"}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
              p === page ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      {nextHref ? (
        <Link
          href={nextHref}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
        >
          Forward →
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-400">
          Forward →
        </span>
      )}
    </div>
  );
}
