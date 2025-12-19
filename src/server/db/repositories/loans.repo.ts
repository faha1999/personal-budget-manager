/**
 * TODO: Implement loans repository with payment tracking and payoff calculations.
 */
import { db } from "@/server/db/client";

export type LoanRow = {
  id: string;
  user_id: string;
  lender: string;
  principal_minor: number;
  outstanding_minor: number;
  interest_rate: number | null;
  start_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function listLoans(userId: string) {
  const res = await db().execute({
    sql: `SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });

  return (res.rows as any[]).map((r) => ({
    ...r,
    principal_minor: Number(r.principal_minor),
    outstanding_minor: Number(r.outstanding_minor),
    interest_rate: r.interest_rate === null || r.interest_rate === undefined ? null : Number(r.interest_rate),
  })) as LoanRow[];
}

export async function getLoan(userId: string, id: string) {
  const res = await db().execute({
    sql: `SELECT * FROM loans WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return null;

  return {
    ...row,
    principal_minor: Number(row.principal_minor),
    outstanding_minor: Number(row.outstanding_minor),
    interest_rate: row.interest_rate === null || row.interest_rate === undefined ? null : Number(row.interest_rate),
  } as LoanRow;
}

export async function createLoan(input: {
  id: string;
  userId: string;
  lender: string;
  principalMinor: number;
  outstandingMinor?: number;
  interestRate?: number | null;
  startDate?: string | null;
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO loans (id, user_id, lender, principal_minor, outstanding_minor, interest_rate, start_date, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.lender,
      input.principalMinor,
      input.outstandingMinor ?? input.principalMinor,
      input.interestRate ?? null,
      input.startDate ?? null,
      input.note ?? null,
    ],
  });
}

export async function updateLoan(input: {
  userId: string;
  id: string;
  patch: Partial<{ lender: string; principal_minor: number; interest_rate: number | null; start_date: string | null; note: string | null }>;
}) {
  const allowed = ["lender", "principal_minor", "interest_rate", "start_date", "note"] as const;
  const sets: string[] = [];
  const args: any[] = [];

  for (const k of allowed) {
    if (k in input.patch) {
      sets.push(`${k} = ?`);
      // @ts-ignore
      args.push(input.patch[k]);
    }
  }
  if (!sets.length) return;

  sets.push(`updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

  await db().execute({
    sql: `UPDATE loans SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`,
    args: [...args, input.userId, input.id],
  });
}

export async function deleteLoan(userId: string, id: string) {
  await db().execute({
    sql: `DELETE FROM loans WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}

export async function addLoanPayment(input: {
  id: string;
  userId: string;
  loanId: string;
  amountMinor: number;
  paidAt: string; // ISO
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO loan_payments (id, user_id, loan_id, amount_minor, paid_at, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [input.id, input.userId, input.loanId, input.amountMinor, input.paidAt, input.note ?? null],
  });
}

export async function listLoanPayments(input: {
  userId: string;
  loanId: string;
  limit: number;
  offset: number;
}) {
  const res = await db().execute({
    sql: `
      SELECT *
      FROM loan_payments
      WHERE user_id = ? AND loan_id = ?
      ORDER BY paid_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [input.userId, input.loanId, input.limit, input.offset],
  });

  const items = (res.rows as any[]).map((r) => ({
    ...r,
    amount_minor: Number(r.amount_minor),
  }));

  const count = await db().execute({
    sql: `SELECT COUNT(1) as cnt FROM loan_payments WHERE user_id = ? AND loan_id = ?`,
    args: [input.userId, input.loanId],
  });

  return { items, total: Number((count.rows[0] as any).cnt || 0) };
}

export async function getLoanPaidTotalMinor(userId: string, loanId: string) {
  const res = await db().execute({
    sql: `SELECT COALESCE(SUM(amount_minor), 0) as paid_minor FROM loan_payments WHERE user_id = ? AND loan_id = ?`,
    args: [userId, loanId],
  });
  return Number((res.rows[0] as any).paid_minor || 0);
}

export async function recalcLoanOutstanding(userId: string, loanId: string) {
  const loanRes = await db().execute({
    sql: `SELECT principal_minor FROM loans WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [loanId, userId],
  });
  if (loanRes.rows.length === 0) return null;

  const principal_minor = Number((loanRes.rows[0] as any)?.principal_minor ?? 0);
  const paid_minor = await getLoanPaidTotalMinor(userId, loanId);
  const outstanding_minor = Math.max(0, principal_minor - paid_minor);

  const now = new Date().toISOString();
  await db().execute({
    sql: `
      UPDATE loans
      SET outstanding_minor = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    args: [outstanding_minor, now, loanId, userId],
  });

  return { principal_minor, paid_minor, outstanding_minor };
}
