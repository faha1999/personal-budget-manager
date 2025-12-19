import Link from "next/link";
import { notFound } from "next/navigation";
import { LoanForm } from "@/components/forms/LoanForm";
import { LoanPaymentForm } from "@/components/forms/LoanPaymentForm";
import { EditToggleCard } from "@/components/ui/EditToggleCard";
import { formatCurrencyFromMinor, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { getLoan, listLoanPayments } from "@/server/db/repositories/loans.repo";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const loan = await getLoan(user.id, params.id);
  if (!loan) return notFound();

  const payments = await listLoanPayments({ userId: user.id, loanId: loan.id, limit: 50, offset: 0 });

  const paid = Math.max(0, loan.principal_minor - loan.outstanding_minor);
  const pct = loan.principal_minor <= 0 ? 0 : Math.min(100, Math.round((paid / loan.principal_minor) * 100));

  return (
    <div className="space-y-6">
      <Header
        title={loan.lender}
        subtitle={`Outstanding ${formatCurrencyFromMinor(loan.outstanding_minor)} • Progress ${pct}%`}
        right={
          <Link
            href="/app/loans"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-slate-50"
          >
            ← Back
          </Link>
        }
      />

      <EditToggleCard title="Edit loan" subtitle="Update lender, principal, or rate">
        <div className="max-w-xl">
          <LoanForm
            initialValues={{
              id: loan.id,
              lender: loan.lender,
              principal_minor: loan.principal_minor,
              interest_rate: loan.interest_rate,
              start_date: loan.start_date,
              note: loan.note,
            }}
          />
        </div>
      </EditToggleCard>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Summary</p>
            <p className="mt-1 text-sm text-slate-600">
              Principal {formatCurrencyFromMinor(loan.principal_minor)} • Paid {formatCurrencyFromMinor(paid)} • Remaining{" "}
              <span className="font-semibold text-slate-900">{formatCurrencyFromMinor(loan.outstanding_minor)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {loan.interest_rate != null ? `Interest: ${loan.interest_rate}%` : "Interest: —"}
              {loan.start_date ? ` • Start: ${loan.start_date}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
        </div>

        {loan.note ? (
          <p className="mt-4 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Note:</span> {loan.note}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <LoanPaymentForm loanId={loan.id} />
      </section>

      <section className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Payment history</p>
          <p className="text-xs text-slate-600">{payments.items.length} payments</p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-black/5">
          <table className="w-full min-w-[520px] bg-white text-left">
            <thead>
              <tr className="border-b border-black/5 text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {payments.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-600">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.items.map((p) => (
                  <tr key={p.id} className="border-b border-black/5 last:border-none">
                    <td className="px-4 py-3 text-slate-700">{formatDate(p.paid_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrencyFromMinor(p.amount_minor)}
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

/* ---------- UI ---------- */

function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
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
