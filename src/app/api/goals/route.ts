// TODO: List or create savings goals scoped by user. (GET).
// TODO: List or create savings goals scoped by user. (POST).

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const res = await db.execute({
    sql: `
      SELECT
        id, title, target_minor, saved_minor, target_date, status, note, created_at, updated_at
      FROM goals
      WHERE user_id = ?
      ORDER BY
        CASE status WHEN 'ACTIVE' THEN 0 ELSE 1 END,
        date(target_date) ASC,
        datetime(created_at) DESC
    `,
    args: [userId],
  });

  return NextResponse.json({ ok: true, items: res.rows });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const body = (await req.json()) as {
      title?: string;
      target_minor?: number; // paisa
      target_date?: string; // YYYY-MM-DD or ISO
      note?: string;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const title = sanitizeText(body.title, { maxLength: 200 });
    const target_minor = toPositiveInteger(body.target_minor);
    const targetISO = body.target_date ? toISODate(body.target_date) : null;
    const target_date = targetISO ? targetISO.slice(0, 10) : null; // store as YYYY-MM-DD
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;

    if (!title) return jsonError("title is required.");
    if (!target_minor || target_minor <= 0) return jsonError("target_minor must be a positive number.");

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO goals
          (id, user_id, title, target_minor, saved_minor, target_date, status, note, created_at, updated_at)
        VALUES
          (?, ?, ?, ?, 0, ?, 'ACTIVE', ?, ?, ?)
      `,
      args: [id, userId, title, target_minor, target_date, note, now, now],
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("Failed to create goal.", 500);
  }
}
