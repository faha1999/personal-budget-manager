// TODO: Update or delete a bank account and recalc balances if needed. (PATCH).
// TODO: Update or delete a bank account and recalc balances if needed. (DELETE).
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    let body: Partial<{
      name: string;
      bank_name: string | null;
      type: string;
      currency: string;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const id = params.id;

    const exists = await db().execute({
      sql: `SELECT id FROM accounts WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Account not found.", 404);

    const name = body.name !== undefined ? sanitizeText(body.name, { maxLength: 120 }) : null;
    const bankName =
      body.bank_name !== undefined ? (body.bank_name ? sanitizeText(body.bank_name, { maxLength: 120 }) : null) : null;
    const type = body.type !== undefined ? sanitizeText(body.type, { maxLength: 50 }) : null;
    const currency = body.currency !== undefined ? sanitizeText(body.currency, { maxLength: 8 }).toUpperCase() : null;

    if (name !== null && name.length === 0) return jsonError("name cannot be empty.");

    const now = new Date().toISOString();

    await db().execute({
      sql: `UPDATE accounts
            SET name = COALESCE(?, name),
                bank_name = COALESCE(?, bank_name),
                type = COALESCE(?, type),
                currency = COALESCE(?, currency),
                updated_at = ?
            WHERE id = ? AND user_id = ?`,
      args: [name, bankName, type, currency, now, id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update account.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const id = params.id;

    // ensure account belongs to user
    const exists = await db().execute({
      sql: `SELECT id FROM accounts WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Account not found.", 404);

    // optional safety: prevent delete if transactions exist
    const txCount = await db().execute({
      sql: `SELECT COUNT(1) as c FROM transactions WHERE user_id = ? AND account_id = ?`,
      args: [userId, id],
    });
    const c = Number((txCount.rows[0] as any)?.c ?? 0);
    if (c > 0) return jsonError("Cannot delete account with transactions. Delete/move transactions first.", 409);

    await db().execute({
      sql: `DELETE FROM accounts WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete account.", 500);
  }
}
