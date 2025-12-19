import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { ensureReceivablesTables, recalcReceivableOutstanding } from "@/server/db/repositories/receivables.repo";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    await ensureReceivablesTables();
    const id = params.id;

    const exists = await db().execute({
      sql: `SELECT id FROM receivables WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Receivable not found.", 404);

    let body: Partial<{
      person: string;
      principal_minor: number;
      start_date: string | null;
      note: string | null;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const person = body.person !== undefined ? sanitizeText(body.person, { maxLength: 160 }) : null;
    const principal_minor = body.principal_minor !== undefined ? toPositiveInteger(body.principal_minor) : null;
    const startISO =
      body.start_date === undefined
        ? null
        : body.start_date
          ? toISODate(body.start_date)
          : null;
    const start_date = startISO ? startISO.slice(0, 10) : null;
    const note = body.note === undefined ? null : body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;

    if (person !== null && person.length === 0) return jsonError("person cannot be empty.");
    if (principal_minor !== null && (!Number.isFinite(principal_minor) || principal_minor <= 0))
      return jsonError("principal_minor must be positive.");

    const now = new Date().toISOString();

    await db().execute({
      sql: `
        UPDATE receivables
        SET
          person = COALESCE(?, person),
          principal_minor = COALESCE(?, principal_minor),
          start_date = CASE WHEN ? IS NULL THEN start_date ELSE ? END,
          note = COALESCE(?, note),
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
      args: [person, principal_minor, body.start_date === undefined ? null : "", start_date, note, now, id, userId],
    });

    await recalcReceivableOutstanding(userId, id);

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update receivable.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    await ensureReceivablesTables();
    const id = params.id;

    const exists = await db().execute({
      sql: `SELECT id FROM receivables WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Receivable not found.", 404);

    await db().execute({
      sql: `DELETE FROM receivable_payments WHERE receivable_id = ? AND user_id = ?`,
      args: [id, userId],
    });

    await db().execute({
      sql: `DELETE FROM receivables WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete receivable.", 500);
  }
}
