// TODO: Update or delete a loan record. (PATCH).
// TODO: Update or delete a loan record. (DELETE).

import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { recalcLoanOutstanding as recalcLoanOutstandingRepo } from "@/server/db/repositories/loans.repo";
import { getSessionUserId } from "@/server/auth/session";
import { sanitizeText, toISODate, toPositiveInteger, toPositiveNumber } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

async function recalcLoanOutstanding(userId: string, loanId: string) {
  return recalcLoanOutstandingRepo(userId, loanId);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const loanId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM loans WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [loanId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Loan not found.", 404);

    let body: Partial<{
      lender: string;
      principal_minor: number;
      interest_rate: number | null;
      start_date: string | null;
      note: string | null;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const lender = body.lender !== undefined ? sanitizeText(body.lender, { maxLength: 160 }) : null;
    const principal_minor = body.principal_minor !== undefined ? toPositiveInteger(body.principal_minor) : null;
    const interest_rate =
      body.interest_rate === undefined
        ? null
        : body.interest_rate === null
          ? null
          : toPositiveNumber(body.interest_rate);
    const startISO =
      body.start_date === undefined
        ? null
        : body.start_date
          ? toISODate(body.start_date)
          : null;
    const start_date = startISO ? startISO.slice(0, 10) : null;

    const note = body.note === undefined ? null : body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;

    if (lender !== null && lender.length === 0) return jsonError("lender cannot be empty.");
    if (principal_minor !== null && (!Number.isFinite(principal_minor) || principal_minor <= 0))
      return jsonError("principal_minor must be positive.");
    if (interest_rate !== null && (!Number.isFinite(interest_rate) || interest_rate < 0))
      return jsonError("interest_rate must be >= 0.");

    const now = new Date().toISOString();

    await db.execute({
      sql: `
        UPDATE loans
        SET
          lender = COALESCE(?, lender),
          principal_minor = COALESCE(?, principal_minor),
          interest_rate = COALESCE(?, interest_rate),
          start_date = CASE WHEN ? IS NULL THEN start_date ELSE ? END,
          note = COALESCE(?, note),
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
      args: [
        lender,
        principal_minor,
        interest_rate,
        body.start_date === undefined ? null : "",
        start_date,
        note,
        now,
        loanId,
        userId,
      ],
    });

    // Recalc outstanding after principal changes
    await recalcLoanOutstanding(userId, loanId);

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update loan.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const loanId = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM loans WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [loanId, userId],
    });
    if (exists.rows.length === 0) return jsonError("Loan not found.", 404);

    await db.execute({
      sql: `DELETE FROM loan_payments WHERE loan_id = ? AND user_id = ?`,
      args: [loanId, userId],
    });

    await db.execute({
      sql: `DELETE FROM loans WHERE id = ? AND user_id = ?`,
      args: [loanId, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete loan.", 500);
  }
}
