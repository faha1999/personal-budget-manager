/**
 * TODO: Implement analytics queries for dashboard KPIs and charts (pre-aggregations recommended).
 */
export const analyticsRepo = {};
import { db } from "@/server/db/client";
import { ensureInvestmentLifecycleColumns } from "@/server/db/repositories/investments.repo";

/**
 * Date bucketing notes:
 * - We'll accept "day" | "week" | "month"
 * - SQLite strftime used for grouping
 */
function bucketExpr(granularity: "day" | "week" | "month") {
  if (granularity === "day") return "strftime('%Y-%m-%d', occurred_at)";
  if (granularity === "week") return "strftime('%Y-W%W', occurred_at)";
  return "strftime('%Y-%m', occurred_at)";
}

export async function getSummary(input: { userId: string; start: string; end: string }) {
  // ensure latest investment lifecycle columns exist before aggregations
  await ensureInvestmentLifecycleColumns();

  const tx = await db().execute({
    sql: `
      SELECT
        COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END), 0) as income_minor,
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END), 0) as expense_minor
      FROM transactions
      WHERE user_id = ? AND occurred_at >= ? AND occurred_at <= ?
    `,
    args: [input.userId, input.start, input.end],
  });

  const income = Number((tx.rows[0] as any).income_minor || 0);
  const expense = Number((tx.rows[0] as any).expense_minor || 0);

  // Accounts net (opening + all transactions) aggregated without double-counting openings
  const [openingRes, txAllRes] = await Promise.all([
    db().execute({
      sql: `
        SELECT COALESCE(SUM(opening_balance_minor), 0) as opening_minor
        FROM accounts
        WHERE user_id = ?
      `,
      args: [input.userId],
    }),
    db().execute({
      sql: `
        SELECT
          COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END), 0) as income_minor,
          COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END), 0) as expense_minor
        FROM transactions
        WHERE user_id = ?
      `,
      args: [input.userId],
    }),
  ]);

  const opening = Number((openingRes.rows[0] as any).opening_minor || 0);
  const txIncomeAll = Number((txAllRes.rows[0] as any).income_minor || 0);
  const txExpenseAll = Number((txAllRes.rows[0] as any).expense_minor || 0);
  const cashNet = opening + txIncomeAll - txExpenseAll;

  // Latest investment totals
  let investments = 0;
  let realizedInvestmentGain = 0;
  try {
    const inv = await db().execute({
      sql: `
        WITH earliest AS (
          SELECT iv.investment_id, iv.value_minor
          FROM investment_values iv
          WHERE iv.user_id = ?
          AND iv.id = (
            SELECT iv2.id FROM investment_values iv2
            WHERE iv2.investment_id = iv.investment_id AND iv2.user_id = iv.user_id
            ORDER BY datetime(iv2.valued_at) ASC, datetime(iv2.created_at) ASC
            LIMIT 1
          )
        )
        SELECT
          COALESCE(SUM(
            CASE
              WHEN i.status = 'CLOSED' THEN 0
              ELSE COALESCE(e.value_minor, 0)
            END
          ), 0) as inv_minor,
          COALESCE(SUM(CASE WHEN i.status = 'CLOSED' THEN COALESCE(i.realized_gain_minor, 0) ELSE 0 END), 0) as realized_gain_minor
        FROM investments i
        LEFT JOIN earliest e ON e.investment_id = i.id
        WHERE i.user_id = ?
      `,
      args: [input.userId, input.userId],
    });

    investments = Number((inv.rows[0] as any).inv_minor || 0);
    realizedInvestmentGain = Number((inv.rows[0] as any).realized_gain_minor || 0);
  } catch {
    investments = 0;
    realizedInvestmentGain = 0;
  }

  // Outstanding loans (stored outstanding to respect adjustments)
  const loan = await db().execute({
    sql: `
      SELECT COALESCE(SUM(outstanding_minor), 0) as outstanding_minor
      FROM loans
      WHERE user_id = ?
    `,
    args: [input.userId],
  });

  const outstandingLoans = Number((loan.rows[0] as any).outstanding_minor || 0);

  // Receivables (assets owed to you). If table missing (older DB), treat as zero.
  let outstandingReceivables = 0;
  try {
    const rec = await db().execute({
      sql: `
        SELECT COALESCE(SUM(outstanding_minor), 0) as outstanding_minor
        FROM receivables
        WHERE user_id = ?
      `,
      args: [input.userId],
    });
    outstandingReceivables = Number((rec.rows[0] as any).outstanding_minor || 0);
  } catch {
    outstandingReceivables = 0;
  }

  const netWorth = cashNet + investments + outstandingReceivables - outstandingLoans;

  return {
    period: { start: input.start, end: input.end },
    income_minor: income,
    expense_minor: expense,
    savings_minor: Math.max(0, income - expense),
    cash_net_minor: cashNet,
    investments_minor: investments,
    investments_realized_gain_minor: realizedInvestmentGain,
    outstanding_loans_minor: outstandingLoans,
    outstanding_receivables_minor: outstandingReceivables,
    net_worth_minor: netWorth,
  };
}

export async function getTrends(input: {
  userId: string;
  start: string;
  end: string;
  granularity: "day" | "week" | "month";
}) {
  const bucket = bucketExpr(input.granularity);

  const tx = await db().execute({
    sql: `
      SELECT
        ${bucket} as bucket,
        COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END), 0) as income_minor,
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END), 0) as expense_minor
      FROM transactions
      WHERE user_id = ? AND occurred_at >= ? AND occurred_at <= ?
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    args: [input.userId, input.start, input.end],
  });

  const series = (tx.rows as any[]).map((r) => ({
    bucket: String(r.bucket),
    income_minor: Number(r.income_minor || 0),
    expense_minor: Number(r.expense_minor || 0),
  }));

  return { granularity: input.granularity, series };
}

export async function getCategories(input: { userId: string; start: string; end: string; type?: "EXPENSE" | "INCOME" }) {
  const type = input.type ?? "EXPENSE";

  const res = await db().execute({
    sql: `
      SELECT
        category,
        COALESCE(SUM(amount_minor), 0) as total_minor
      FROM transactions
      WHERE user_id = ? AND type = ? AND occurred_at >= ? AND occurred_at <= ?
      GROUP BY category
      ORDER BY total_minor DESC
      LIMIT 20
    `,
    args: [input.userId, type, input.start, input.end],
  });

  return (res.rows as any[]).map((r) => ({
    category: String(r.category),
    total_minor: Number(r.total_minor || 0),
  }));
}
