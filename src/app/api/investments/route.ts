// TODO: List or create investments for the user. (GET).
// TODO: List or create investments for the user. (POST).

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { ensureInvestmentLifecycleColumns } from "@/server/db/repositories/investments.repo";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  await ensureInvestmentLifecycleColumns();

  // latest value per investment
  const res = await db.execute({
    sql: `
      SELECT i.id, i.name, i.type, i.currency, i.units, i.note, i.status, i.closed_at, i.final_value_minor, i.realized_gain_minor, i.created_at, i.updated_at,
             v.value_minor as latest_value_minor,
             v.valued_at as latest_valued_at
      FROM investments i
      LEFT JOIN investment_values v
        ON v.id = (
          SELECT iv.id FROM investment_values iv
          WHERE iv.investment_id = i.id AND iv.user_id = i.user_id
          ORDER BY datetime(iv.valued_at) DESC, datetime(iv.created_at) DESC
          LIMIT 1
        )
      WHERE i.user_id = ?
      ORDER BY datetime(i.created_at) DESC
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
      name?: string;
      type?: string; // STOCK, DPS, FDR, CRYPTO, LAND, GOLD, etc.
      currency?: string; // BDT
      units?: number; // optional
      note?: string;
      initial_value_minor?: number; // optional
      valued_at?: string; // optional ISO date
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const name = sanitizeText(body.name, { maxLength: 120 });
    const type = sanitizeText(body.type ?? "INVESTMENT", { maxLength: 60 }) || "INVESTMENT";
    const currency = sanitizeText(body.currency ?? "BDT", { maxLength: 8 }).toUpperCase() || "BDT";
    const units = body.units === undefined || body.units === null ? null : Number(body.units);
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) || null : null;
    const now = new Date().toISOString();
    const hasInitialValue = body.initial_value_minor !== undefined;
    let initialValueMinor: number | undefined;
    let valuedAt: string | undefined;

    if (!name) return jsonError("name is required.");
    if (units !== null && (!Number.isFinite(units) || units < 0)) return jsonError("units must be >= 0.");
    if (hasInitialValue) {
      const parsed = toPositiveInteger(body.initial_value_minor);
      if (parsed === null) return jsonError("initial_value_minor must be >= 0.");
      initialValueMinor = parsed;
      valuedAt = toISODate(body.valued_at) ?? now;
    }

    const id = randomUUID();

    await ensureInvestmentLifecycleColumns();

    await db.execute({
      sql: `INSERT INTO investments (id, user_id, name, type, currency, units, note, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      args: [id, userId, name, type, currency, units, note, now, now],
    });

    // optional initial value entry
    if (hasInitialValue && initialValueMinor !== undefined && valuedAt !== undefined) {
      const ivId = randomUUID();

      await db.execute({
        sql: `INSERT INTO investment_values (id, user_id, investment_id, value_minor, valued_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [ivId, userId, id, initialValueMinor, valuedAt, now],
      });
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("Failed to create investment.", 500);
  }
}
