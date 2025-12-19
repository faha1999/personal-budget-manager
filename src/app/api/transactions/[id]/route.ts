// TODO: Update or delete a transaction for the current user. (PATCH).
// // TODO: Update or delete a transaction for the current user. (DELETE).

import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const id = params.id;

    // Load existing (needed for balance adjustment)
    const existingRes = await db().execute({
      sql: `SELECT id, account_id, type, amount_minor FROM transactions WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (existingRes.rows.length === 0) return jsonError("Transaction not found.", 404);

    const existing = existingRes.rows[0] as any;

    let body: Partial<{
      accountId: string;
      type: "INCOME" | "EXPENSE";
      category: string;
      note: string | null;
      amount_minor: number;
      occurred_at: string;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const nextAccountId = body.accountId
      ? sanitizeText(body.accountId, { maxLength: 128 })
      : String(existing.account_id);
    const nextType =
      body.type === "INCOME" || body.type === "EXPENSE" ? body.type : (existing.type as "INCOME" | "EXPENSE");
    const nextCategory = body.category ? sanitizeText(body.category, { maxLength: 80 }) : undefined;
    const nextNote =
      body.note === undefined ? undefined : body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    const nextAmountMinorRaw =
      body.amount_minor === undefined ? Number(existing.amount_minor) : toPositiveInteger(body.amount_minor);
    const nextAmountMinor = nextAmountMinorRaw === null ? null : Number(nextAmountMinorRaw);
    const nextOccurredAt = body.occurred_at ? toISODate(body.occurred_at) : undefined;

    if (nextType !== "INCOME" && nextType !== "EXPENSE") return jsonError("type must be INCOME or EXPENSE.");
    if (nextAmountMinor === null || !Number.isFinite(nextAmountMinor) || nextAmountMinor <= 0)
      return jsonError("amount_minor must be positive.");
    if (nextCategory !== undefined && !nextCategory) return jsonError("category cannot be empty.");

    // verify new account belongs to user
    const acc = await db().execute({
      sql: `SELECT id FROM accounts WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [nextAccountId, userId],
    });
    if (acc.rows.length === 0) return jsonError("Invalid account.", 404);

    const now = new Date().toISOString();

    await db().execute({
      sql: `UPDATE transactions
            SET account_id = ?,
                type = ?,
                category = COALESCE(?, category),
                note = COALESCE(?, note),
                amount_minor = ?,
                occurred_at = COALESCE(?, occurred_at),
                updated_at = ?
            WHERE id = ? AND user_id = ?`,
      args: [
        nextAccountId,
        nextType,
        nextCategory ?? null,
        nextNote ?? null,
        nextAmountMinor,
        nextOccurredAt ?? null,
        now,
        id,
        userId,
      ],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update transaction.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const id = params.id;

    const existingRes = await db().execute({
      sql: `SELECT id, account_id, type, amount_minor FROM transactions WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (existingRes.rows.length === 0) return jsonError("Transaction not found.", 404);

    await db().execute({
      sql: `DELETE FROM transactions WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete transaction.", 500);
  }
}
