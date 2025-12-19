// TODO: Update or delete an investment and fetch history. (PATCH).
// TODO: Update or delete an investment and fetch history. (DELETE).
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/server/db/client";
import { getSessionUserId } from "@/server/auth/session";
import { ensureInvestmentLifecycleColumns, getEarliestInvestmentValue, updateInvestment } from "@/server/db/repositories/investments.repo";
import { sanitizeText, toISODate, toPositiveInteger } from "@/shared/security/sanitize";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    await ensureInvestmentLifecycleColumns();

    const id = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM investments WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Investment not found.", 404);

    let body: Partial<{
      name: string;
      type: string;
      currency: string;
      units: number | null;
      note: string | null;
      initial_value_minor?: number | null;
      valued_at?: string | null;
      status?: "ACTIVE" | "CLOSED";
      final_value_minor?: number | null;
      closed_at?: string | null;
      close?: boolean;
    }>;
    try {
      body = (await req.json()) as any;
    } catch {
      return jsonError("Invalid request body.");
    }

    const patch: Record<string, any> = {};

    if (body.name !== undefined) {
      const name = sanitizeText(body.name, { maxLength: 120 });
      if (!name) return jsonError("name cannot be empty.");
      patch.name = name;
    }

    if (body.type !== undefined) {
      const type = sanitizeText(body.type, { maxLength: 60 });
      if (!type) return jsonError("type cannot be empty.");
      patch.type = type;
    }

    if (body.currency !== undefined) {
      const currency = sanitizeText(body.currency, { maxLength: 8 }).toUpperCase();
      if (!currency) return jsonError("currency cannot be empty.");
      patch.currency = currency;
    }

    if (body.units !== undefined) {
      const units = body.units === null ? null : Number(body.units);
      if (units !== null && (!Number.isFinite(units) || units < 0)) {
        return jsonError("units must be >= 0.");
      }
      patch.units = units;
    }

    if (body.note !== undefined) {
      patch.note = body.note ? sanitizeText(body.note, { maxLength: 240 }) : null;
    }

    let initialValueMinor: number | undefined;
    if (body.initial_value_minor !== undefined) {
      const parsed = toPositiveInteger(body.initial_value_minor);
      if (parsed === null) return jsonError("initial_value_minor must be >= 0.");
      initialValueMinor = parsed;
    }

    let initialValuedAt: string | undefined;
    if (body.valued_at !== undefined) {
      const parsed = toISODate(body.valued_at);
      if (!parsed) return jsonError("valued_at must be a valid date.");
      initialValuedAt = parsed;
    }

    let finalValueMinor: number | undefined;
    if (body.final_value_minor !== undefined) {
      const parsed = toPositiveInteger(body.final_value_minor);
      if (parsed === null) return jsonError("final_value_minor must be >= 0.");
      finalValueMinor = parsed;
    }

    let closedAt: string | undefined;
    if (body.closed_at !== undefined) {
      const parsed = toISODate(body.closed_at);
      if (!parsed) return jsonError("closed_at must be a valid date.");
      closedAt = parsed;
    }

    const closeRequested = body.close === true || body.status === "CLOSED";
    const inferredClose = closeRequested || finalValueMinor !== undefined || closedAt !== undefined;
    const reopenRequested = body.status === "ACTIVE";

    const wantsInitialUpdate = initialValueMinor !== undefined || initialValuedAt !== undefined;
    const wantsPatch = Object.keys(patch).length > 0 || closeRequested || reopenRequested || finalValueMinor !== undefined || closedAt !== undefined;

    if (wantsInitialUpdate) {
      const existingInitial = await db.execute({
        sql: `
          SELECT id, value_minor, valued_at
          FROM investment_values
          WHERE investment_id = ? AND user_id = ?
          ORDER BY datetime(valued_at) ASC, datetime(created_at) ASC
          LIMIT 1
        `,
        args: [id, userId],
      });

      const row = existingInitial.rows[0] as any | undefined;
      if (!row && initialValueMinor === undefined) {
        return jsonError("initial_value_minor is required when no prior value exists.");
      }

      const now = new Date().toISOString();

      if (!row) {
        await db.execute({
          sql: `
            INSERT INTO investment_values (id, user_id, investment_id, value_minor, valued_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          args: [randomUUID(), userId, id, initialValueMinor ?? 0, initialValuedAt ?? now, now],
        });
      } else {
        await db.execute({
          sql: `
            UPDATE investment_values
            SET value_minor = ?, valued_at = ?
            WHERE id = ? AND user_id = ?
          `,
          args: [
            initialValueMinor ?? Number(row.value_minor ?? 0),
            initialValuedAt ?? row.valued_at,
            row.id,
            userId,
          ],
        });
      }
    }

    if (inferredClose || reopenRequested) {
      if (inferredClose && !reopenRequested) {
        if (finalValueMinor === undefined) return jsonError("final_value_minor is required when closing.");

        const earliest = await getEarliestInvestmentValue(userId, id);
        const basis = earliest?.value_minor ?? finalValueMinor ?? 0;
        const realized = finalValueMinor - basis;

        patch.status = "CLOSED";
        patch.closed_at = closedAt ?? new Date().toISOString();
        patch.final_value_minor = finalValueMinor;
        patch.realized_gain_minor = realized;
      } else if (reopenRequested) {
        patch.status = "ACTIVE";
        patch.closed_at = null;
        patch.final_value_minor = null;
        patch.realized_gain_minor = null;
      }
    }

    if (wantsPatch) {
      await updateInvestment({ userId, id, patch });
    } else if (!wantsInitialUpdate) {
      return NextResponse.json({ ok: true }); // nothing to update
    }

    // keep investment updated_at in sync when values change
    await db.execute({
      sql: `UPDATE investments SET updated_at = ? WHERE id = ? AND user_id = ?`,
      args: [new Date().toISOString(), id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to update investment.", 500);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  try {
    const id = params.id;

    const exists = await db.execute({
      sql: `SELECT id FROM investments WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [id, userId],
    });
    if (exists.rows.length === 0) return jsonError("Investment not found.", 404);

    // delete values first (FK-safe)
    await db.execute({
      sql: `DELETE FROM investment_values WHERE investment_id = ? AND user_id = ?`,
      args: [id, userId],
    });

    await db.execute({
      sql: `DELETE FROM investments WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Failed to delete investment.", 500);
  }
}
