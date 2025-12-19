// TODO: List or create bank accounts scoped by user. (GET).
// TODO: List or create bank accounts scoped by user. (POST).

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const res = await db().execute({
    sql: `
      SELECT
        a.id,
        a.name,
        a.bank_name,
        a.type,
        a.currency,
        a.opening_balance_minor,
        a.created_at,
        a.updated_at,
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

  const items = res.rows.map((row: any) => {
    const income = Number(row.income_minor ?? 0);
    const expense = Number(row.expense_minor ?? 0);
    const opening = Number(row.opening_balance_minor ?? 0);
    return {
      id: row.id,
      name: row.name,
      bank_name: row.bank_name,
      type: row.type,
      currency: row.currency,
      opening_balance_minor: opening,
      balance_minor: opening + income - expense,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await req.json()) as {
      name?: string;
      bank_name?: string;
      type?: string; // e.g. CASH, BANK, MOBILE_WALLET
      currency?: string; // "BDT"
      opening_balance_minor?: number;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const name = sanitizeText(body.name, { maxLength: 120 });
    const bankName = body.bank_name ? sanitizeText(body.bank_name, { maxLength: 120 }) : null;
    const type = sanitizeText(body.type ?? "BANK", { maxLength: 50 }) || "BANK";
    const currency = sanitizeText(body.currency ?? "BDT", { maxLength: 8 }).toUpperCase() || "BDT";
    const opening = body.opening_balance_minor !== undefined ? toPositiveInteger(body.opening_balance_minor) : 0;

    if (!name) return jsonError("name is required.");
    if (opening === null || opening < 0) return jsonError("opening_balance_minor must be >= 0.");

    const id = randomUUID();
    const now = new Date().toISOString();

    await db().execute({
      sql: `INSERT INTO accounts (id, user_id, name, bank_name, type, currency, opening_balance_minor, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, bankName, type, currency, opening ?? 0, now, now],
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("Failed to create account.", 500);
  }
}
