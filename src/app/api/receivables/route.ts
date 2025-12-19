import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { ensureReceivablesTables } from "@/server/db/repositories/receivables.repo";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  await ensureReceivablesTables();

  const res = await db.execute({
    sql: `
      SELECT id, person, principal_minor, outstanding_minor, start_date, note, created_at, updated_at
      FROM receivables
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    args: [userId],
  });

  return NextResponse.json({ ok: true, items: res.rows });
}

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }

  try {
    const form = await req.formData();
    const obj: Record<string, unknown> = {};
    form.forEach((v, k) => {
      if (typeof v === "string") obj[k] = v;
    });
    return obj;
  } catch {
    return {};
  }
}

function parseAmountToMinor(body: Record<string, unknown>) {
  const bdtRaw = (body.principal_bdt as string | undefined) ?? (body.principal_minor as string | undefined);
  if (bdtRaw === undefined || bdtRaw === null) return null;
  const cleaned = String(bdtRaw).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    await ensureReceivablesTables();

    const body = (await parseBody(req)) as {
      person?: string;
      principal_bdt?: string;
      principal_minor?: number | string;
      start_date?: string;
      note?: string;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid request body.");

    const person = sanitizeText(body.person, { maxLength: 160 });
    const principal_minor = parseAmountToMinor(body);
    const startISO = body.start_date ? toISODate(body.start_date) : null;
    const start_date = startISO ? startISO.slice(0, 10) : null;
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;

    if (!person) return jsonError("person is required.");
    if (principal_minor === null) return jsonError("principal must be a positive number (BDT).");

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO receivables
          (id, user_id, person, principal_minor, outstanding_minor, start_date, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, person, principal_minor, principal_minor, start_date, note, now, now],
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes("no such table: receivables")) {
      return jsonError("Receivables tables are not migrated yet. Please run migrations.", 500);
    }
    return jsonError("Failed to create receivable.", 500);
  }
}
