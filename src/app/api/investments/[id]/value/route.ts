import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { toISODate } from "@/shared/security/sanitize";

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
  const bdtRaw =
    (body.amount_bdt as string | undefined) ??
    (body.value_bdt as string | undefined) ??
    (body.value as string | undefined);

  if (bdtRaw !== undefined && bdtRaw !== null) {
    const cleaned = String(bdtRaw).replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100); // BDT -> paisa
  }

  if (body.value_minor !== undefined && body.value_minor !== null) {
    const minor = Number(body.value_minor);
    if (!Number.isFinite(minor) || minor < 0) return null;
    return Math.round(minor);
  }

  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const investmentId = params.id;
    const exists = await db.execute({
      sql: `SELECT id, status FROM investments WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [investmentId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Investment not found.", 404);
    const status = (exists.rows[0] as any)?.status;
    if (status === "CLOSED") return jsonError("Investment is closed; cannot add new values.", 400);

    const body = (await parseBody(req)) as {
      value_minor?: number | string;
      amount_bdt?: string;
      value_bdt?: string;
      value?: string;
      valued_at?: string;
    };

    const value_minor = parseAmountToMinor(body);
    if (value_minor === null) return jsonError("value must be >= 0 in BDT.");

    const valued_at = body.valued_at ? toISODate(body.valued_at) ?? new Date().toISOString() : new Date().toISOString();
    const now = new Date().toISOString();
    const id = randomUUID();

    await db.execute({
      sql: `
        INSERT INTO investment_values (id, user_id, investment_id, value_minor, valued_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, investmentId, value_minor, valued_at, now],
    });

    return NextResponse.json({ ok: true, id, valued_at });
  } catch {
    return jsonError("Failed to add value.", 500);
  }
}
