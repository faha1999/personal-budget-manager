// TODO: Return dashboard summary metrics for selected period. (GET).

import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { ensureInvestmentLifecycleColumns } from "@/server/db/repositories/investments.repo";
import { sanitizeText } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  await ensureInvestmentLifecycleColumns();

  const url = new URL(req.url);
  const start = sanitizeText(url.searchParams.get("start"), { maxLength: 10 }); // YYYY-MM-DD
  const end = sanitizeText(url.searchParams.get("end"), { maxLength: 10 }); // YYYY-MM-DD

  const dateWhere: string[] = ["user_id = ?"];
  const args: any[] = [userId];

  if (start) {
    dateWhere.push("date(occurred_at) >= date(?)");
    args.push(start);
  }
  if (end) {
    dateWhere.push("date(occurred_at) <= date(?)");
    args.push(end);
  }

  // Income/Expense for selected period
  const incRes = await db().execute({
    sql: `SELECT COALESCE(SUM(amount_minor),0) AS s FROM transactions WHERE ${dateWhere.join(" AND ")} AND type = 'INCOME'`,
    args,
  });
  const expRes = await db().execute({
    sql: `SELECT COALESCE(SUM(amount_minor),0) AS s FROM transactions WHERE ${dateWhere.join(" AND ")} AND type = 'EXPENSE'`,
    args,
  });

  const income_minor = Number((incRes.rows[0] as any)?.s ?? 0);
  const expense_minor = Number((expRes.rows[0] as any)?.s ?? 0);

  // Account balances (current) = opening + all tx (avoid opening double-count from JOIN)
  const [accountsOpeningRes, accountTxRes] = await Promise.all([
    db().execute({
      sql: `
        SELECT COALESCE(SUM(opening_balance_minor),0) AS opening_minor
        FROM accounts
        WHERE user_id = ?
      `,
      args: [userId],
    }),
    db().execute({
      sql: `
        SELECT
          COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END),0) AS income_minor,
          COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END),0) AS expense_minor
        FROM transactions
        WHERE user_id = ?
      `,
      args: [userId],
    }),
  ]);
  const opening_balance_minor = Number((accountsOpeningRes.rows[0] as any)?.opening_minor ?? 0);
  const account_income_minor = Number((accountTxRes.rows[0] as any)?.income_minor ?? 0);
  const account_expense_minor = Number((accountTxRes.rows[0] as any)?.expense_minor ?? 0);
  const accounts_balance_minor = opening_balance_minor + account_income_minor - account_expense_minor;

  // Investments total uses initial principal for ACTIVE; CLOSED contribute 0 (profit/loss excluded from net worth)
  let investments_value_minor = 0;
  let investments_realized_gain_minor = 0;
  try {
    const invRes = await db().execute({
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
          ), 0) AS total_minor,
          COALESCE(SUM(CASE WHEN i.status = 'CLOSED' THEN COALESCE(i.realized_gain_minor, 0) ELSE 0 END), 0) AS realized_gain_minor
        FROM investments i
        LEFT JOIN earliest e ON e.investment_id = i.id
        WHERE i.user_id = ?
      `,
      args: [userId, userId],
    });
    investments_value_minor = Number((invRes.rows[0] as any)?.total_minor ?? 0);
    investments_realized_gain_minor = Number((invRes.rows[0] as any)?.realized_gain_minor ?? 0);
  } catch {
    investments_value_minor = 0;
    investments_realized_gain_minor = 0;
  }

  // Goals
  const goalsRes = await db().execute({
    sql: `
      SELECT
        COUNT(1) AS goals_count,
        COALESCE(SUM(target_minor),0) AS target_sum,
        COALESCE(SUM(saved_minor),0) AS saved_sum
      FROM goals
      WHERE user_id = ?
    `,
    args: [userId],
  });
  const goals_count = Number((goalsRes.rows[0] as any)?.goals_count ?? 0);
  const goals_target_minor = Number((goalsRes.rows[0] as any)?.target_sum ?? 0);
  const goals_saved_minor = Number((goalsRes.rows[0] as any)?.saved_sum ?? 0);

  // Loans
  const loansRes = await db().execute({
    sql: `
      SELECT
        COUNT(1) AS loans_count,
        COALESCE(SUM(outstanding_minor),0) AS outstanding_sum
      FROM loans
      WHERE user_id = ?
    `,
    args: [userId],
  });
  const loans_count = Number((loansRes.rows[0] as any)?.loans_count ?? 0);
  const loans_outstanding_minor = Number((loansRes.rows[0] as any)?.outstanding_sum ?? 0);

  // Receivables (money owed to you)
  let receivables_count = 0;
  let receivables_outstanding_minor = 0;
  try {
    const recRes = await db().execute({
      sql: `
        SELECT
          COUNT(1) AS receivables_count,
          COALESCE(SUM(outstanding_minor),0) AS outstanding_sum
        FROM receivables
        WHERE user_id = ?
      `,
      args: [userId],
    });
    receivables_count = Number((recRes.rows[0] as any)?.receivables_count ?? 0);
    receivables_outstanding_minor = Number((recRes.rows[0] as any)?.outstanding_sum ?? 0);
  } catch {
    // old DB without receivables table; keep defaults as 0
  }

  const net_change_minor = income_minor - expense_minor;

  // Net worth approximation: accounts + investments + receivables - outstanding loans
  const net_worth_minor = accounts_balance_minor + investments_value_minor + receivables_outstanding_minor - loans_outstanding_minor;

  return NextResponse.json({
    ok: true,
    period: { start, end },
    totals: {
      income_minor,
      expense_minor,
      net_change_minor,
    },
    balance: {
      accounts_balance_minor,
      investments_value_minor,
      investments_realized_gain_minor,
      loans_outstanding_minor,
      receivables_outstanding_minor,
      net_worth_minor,
    },
    goals: {
      goals_count,
      goals_target_minor,
      goals_saved_minor,
    },
    receivables: {
      receivables_count,
      receivables_outstanding_minor,
    },
  });
}
