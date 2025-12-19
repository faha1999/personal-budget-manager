// TODO: Update or delete a goal and recalc progress. (PATCH).
// TODO: Update or delete a goal and recalc progress. (DELETE).

import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { recalcGoalProgress as recalcGoalProgressRepo } from "@/server/db/repositories/goals.repo";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const goalId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM goals WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [goalId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Goal not found.", 404);

    let body: Partial<{
      title: string;
      target_minor: number;
      target_date: string | null;
      status: "ACTIVE" | "COMPLETED";
      note: string | null;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const title = body.title !== undefined ? sanitizeText(body.title, { maxLength: 200 }) : null;
    const target_minor = body.target_minor !== undefined ? toPositiveInteger(body.target_minor) : null;
    const targetISO =
      body.target_date === undefined
        ? null
        : body.target_date
          ? toISODate(body.target_date)
          : null;
    const target_date = targetISO ? targetISO.slice(0, 10) : null;

    const note = body.note === undefined ? null : body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    const status = body.status !== undefined ? body.status : null;

    if (title !== null && title.length === 0) return jsonError("title cannot be empty.");
    if (target_minor !== null && (!Number.isFinite(target_minor) || target_minor <= 0))
      return jsonError("target_minor must be positive.");
    if (status !== null && status !== "ACTIVE" && status !== "COMPLETED")
      return jsonError("status must be ACTIVE or COMPLETED.");

    const now = new Date().toISOString();

    await db.execute({
      sql: `
        UPDATE goals
        SET
          title = COALESCE(?, title),
          target_minor = COALESCE(?, target_minor),
          target_date = CASE
            WHEN ? IS NULL THEN target_date
            ELSE ?
          END,
          note = COALESCE(?, note),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
      args: [
        title,
        target_minor,
        body.target_date === undefined ? null : "", // sentinel
        target_date, // set when sentinel present
        note,
        status,
        now,
        goalId,
        userId,
      ],
    });

    // recalc progress to keep status consistent (unless you want manual status)
    await recalcGoalProgressRepo(userId, goalId);

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update goal.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const goalId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM goals WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [goalId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Goal not found.", 404);

    // delete contributions first (FK-safe)
    await db.execute({
      sql: `DELETE FROM goal_contributions WHERE goal_id = ? AND user_id = ?`,
      args: [goalId, userId],
    });

    await db.execute({
      sql: `DELETE FROM goals WHERE id = ? AND user_id = ?`,
      args: [goalId, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete goal.", 500);
  }
}
