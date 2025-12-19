// TODO: Return trend data (income vs expense, net worth) over time. (GET).

import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const start = sanitizeText(url.searchParams.get("start"), { maxLength: 10 }); // YYYY-MM-DD
  const end = sanitizeText(url.searchParams.get("end"), { maxLength: 10 }); // YYYY-MM-DD
  const granularity = (sanitizeText(url.searchParams.get("granularity"), { maxLength: 10 }) || "day").toLowerCase();

  let bucketExpr = "date(occurred_at)";
  if (granularity === "month") {
    bucketExpr = "strftime('%Y-%m', occurred_at)";
  } else if (granularity === "week") {
    // ISO-ish week bucket label: YYYY-WW (SQLite week-of-year)
    bucketExpr = "strftime('%Y-W%W', occurred_at)";
  } else {
    bucketExpr = "date(occurred_at)";
  }

  const where: string[] = ["user_id = ?"];
  const args: any[] = [userId];

  if (start) {
    where.push("date(occurred_at) >= date(?)");
    args.push(start);
  }
  if (end) {
    where.push("date(occurred_at) <= date(?)");
    args.push(end);
  }

  const res = await db.execute({
    sql: `
      SELECT
        ${bucketExpr} AS bucket,
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_minor ELSE 0 END), 0) AS income_minor,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_minor ELSE 0 END), 0) AS expense_minor
      FROM transactions
      WHERE ${where.join(" AND ")}
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    args,
  });

  const items = res.rows.map((r: any) => {
    const income = Number(r.income_minor ?? 0);
    const expense = Number(r.expense_minor ?? 0);
    return {
      bucket: String(r.bucket),
      income_minor: income,
      expense_minor: expense,
      net_change_minor: income - expense,
    };
  });

  return NextResponse.json({
    ok: true,
    period: { start, end },
    granularity,
    items,
  });
}
