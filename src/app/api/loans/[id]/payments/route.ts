import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { recalcLoanOutstanding } from "@/server/db/repositories/loans.repo";
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

  // Support form submissions from <form method="post">
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
    return Math.round(n * 100); // BDT -> paisa
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
    const loanId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM loans WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [loanId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Loan not found.", 404);

    const body = (await parseBody(req)) as {
      amount_bdt?: string;
      amount?: string;
      amount_minor?: number | string;
      paid_at?: string;
      note?: string;
    };

    const amount_minor = parseAmountToMinor(body);
    if (amount_minor === null) return jsonError("amount must be a positive number in BDT.");

    const paid_at = body.paid_at ? toISODate(body.paid_at) ?? new Date().toISOString() : new Date().toISOString();
    const note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    const id = randomUUID();

    await db.execute({
      sql: `
        INSERT INTO loan_payments (id, user_id, loan_id, amount_minor, paid_at, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, loanId, amount_minor, paid_at, note],
    });

    const progress = await recalcLoanOutstanding(userId, loanId);

    return NextResponse.json({
      ok: true,
      id,
      outstanding_minor: progress?.outstanding_minor,
      paid_minor: progress?.paid_minor,
    });
  } catch {
    return jsonError("Failed to add payment.", 500);
  }
}
