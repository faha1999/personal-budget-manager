import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const start = url.searchParams.get("start"); // YYYY-MM-DD
  const end = url.searchParams.get("end"); // YYYY-MM-DD
  const type = url.searchParams.get("type"); // INCOME|EXPENSE
  const category = sanitizeText(url.searchParams.get("category"), { maxLength: 80 });
  const accountId = sanitizeText(url.searchParams.get("accountId"), { maxLength: 128 });
  const limit = Math.min(100, Math.max(1, toInt(url.searchParams.get("limit"), 25)));
  const offset = Math.max(0, toInt(url.searchParams.get("offset"), 0));

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
  if (type === "INCOME" || type === "EXPENSE") {
    where.push("type = ?");
    args.push(type);
  }
  if (category) {
    where.push("category = ?");
    args.push(category);
  }
  if (accountId) {
    where.push("account_id = ?");
    args.push(accountId);
  }

  const sql = `
    SELECT id, account_id, type, category, note, amount_minor, occurred_at, created_at, updated_at
    FROM transactions
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(occurred_at) DESC, datetime(created_at) DESC
    LIMIT ? OFFSET ?
  `;

  const res = await db().execute({ sql, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, items: res.rows });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await req.json()) as {
      accountId?: string;
      type?: "INCOME" | "EXPENSE";
      category?: string;
      note?: string;
      amount_minor?: number;
      occurred_at?: string; // ISO or YYYY-MM-DD
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const accountId = sanitizeText(body.accountId, { maxLength: 128 });
    const type = body.type === "INCOME" || body.type === "EXPENSE" ? body.type : null;
    const category = sanitizeText(body.category, { maxLength: 80 });
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    const amount_minor = toPositiveInteger(body.amount_minor);
    const occurred_at = toISODate(body.occurred_at) ?? new Date().toISOString();

    if (!accountId) return jsonError("accountId is required.");
    if (!type) return jsonError("type must be INCOME or EXPENSE.");
    if (!category) return jsonError("category is required.");
    if (!amount_minor || amount_minor <= 0) return jsonError("amount_minor must be a positive number.");

    // verify account belongs to user
    const acc = await db().execute({
      sql: `SELECT id FROM accounts WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [accountId, userId],
    });
    if (acc.rows.length === 0) return jsonError("Invalid account.", 404);

    const id = randomUUID();
    const now = new Date().toISOString();

    await db().execute({
      sql: `INSERT INTO transactions
            (id, user_id, account_id, type, category, note, amount_minor, occurred_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, accountId, type, category, note, amount_minor, occurred_at, now, now],
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("Failed to create expense.", 500);
  }
}
