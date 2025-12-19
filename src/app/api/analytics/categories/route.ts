// TODO: Return expense breakdown by category. (GET).

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
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 15)));

  const where: string[] = ["user_id = ?", "type = 'EXPENSE'"];
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
        category,
        COALESCE(SUM(amount_minor),0) AS total_minor
      FROM transactions
      WHERE ${where.join(" AND ")}
      GROUP BY category
      ORDER BY total_minor DESC
      LIMIT ?
    `,
    args: [...args, limit],
  });

  const items = res.rows.map((r: any) => ({
    category: String(r.category ?? "Uncategorized"),
    total_minor: Number(r.total_minor ?? 0),
  }));

  return NextResponse.json({
    ok: true,
    period: { start, end },
    items,
  });
}
