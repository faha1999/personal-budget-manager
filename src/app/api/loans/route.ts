// TODO: List or create loans scoped by user. (GET).
// TODO: List or create loans scoped by user. (POST).

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger, toPositiveNumber } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const res = await db.execute({
    sql: `
      SELECT
        id, lender, principal_minor, outstanding_minor, interest_rate, start_date, note, created_at, updated_at
      FROM loans
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
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
      lender?: string;
      principal_minor?: number;
      interest_rate?: number; // annual %
      start_date?: string; // YYYY-MM-DD or ISO
      note?: string;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const lender = sanitizeText(body.lender, { maxLength: 160 });
    const principal_minor = toPositiveInteger(body.principal_minor);
    const interest_rate = body.interest_rate === undefined ? null : toPositiveNumber(body.interest_rate);
    const startISO = body.start_date ? toISODate(body.start_date) : null;
    const start_date = startISO ? startISO.slice(0, 10) : null;
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;

    if (!lender) return jsonError("lender is required.");
    if (!principal_minor || principal_minor <= 0) return jsonError("principal_minor must be positive.");
    if (interest_rate !== null && (!Number.isFinite(interest_rate) || interest_rate < 0))
      return jsonError("interest_rate must be >= 0.");

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO loans
          (id, user_id, lender, principal_minor, outstanding_minor, interest_rate, start_date, note, created_at, updated_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        userId,
        lender,
        principal_minor,
        principal_minor, // outstanding starts equal to principal
        interest_rate,
        start_date,
        note,
        now,
        now,
      ],
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("Failed to create loan.", 500);
  }
}
