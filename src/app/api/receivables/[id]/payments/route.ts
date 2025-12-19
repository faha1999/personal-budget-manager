import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { ensureReceivablesTables, recalcReceivableOutstanding } from "@/server/db/repositories/receivables.repo";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
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
  const bdtRaw = (body.amount_bdt as string | undefined) ?? (body.amount as string | undefined);
  if (bdtRaw !== undefined && bdtRaw !== null) {
    const cleaned = String(bdtRaw).replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  if (body.amount_minor !== undefined && body.amount_minor !== null) {
    const minor = Number(body.amount_minor);
    if (!Number.isFinite(minor) || minor <= 0) return null;
    return Math.round(minor);
  }

  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    await ensureReceivablesTables();

    const receivableId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM receivables WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [receivableId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Receivable not found.", 404);

    const body = (await parseBody(req)) as {
      amount_bdt?: string;
      amount?: string;
      amount_minor?: number | string;
      received_at?: string;
      note?: string;
    };
    const amount_minor = parseAmountToMinor(body);
    if (amount_minor === null) return jsonError("amount must be a positive number in BDT.");

    const received_at = body.received_at ? toISODate(body.received_at) ?? new Date().toISOString() : new Date().toISOString();
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    const id = randomUUID();

    await db.execute({
      sql: `
        INSERT INTO receivable_payments (id, user_id, receivable_id, amount_minor, received_at, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, receivableId, amount_minor, received_at, note],
    });

    const progress = await recalcReceivableOutstanding(userId, receivableId);

    return NextResponse.json({
      ok: true,
      id,
      outstanding_minor: progress?.outstanding_minor,
      received_minor: progress?.paid_minor,
    });
  } catch {
    return jsonError("Failed to record payment.", 500);
  }
}
