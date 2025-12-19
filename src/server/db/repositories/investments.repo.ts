/**
 * TODO: Implement investments repository with value history helpers.
 */
import { db } from "@/server/db/client";

export type InvestmentRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  provider: string | null;
  currency: string;
  units: number | null;
  note: string | null;
  status: "ACTIVE" | "CLOSED";
  closed_at: string | null;
  final_value_minor: number | null;
  realized_gain_minor: number | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentValueRow = {
  id: string;
  user_id: string;
  investment_id: string;
  value_minor: number;
  valued_at: string;
  created_at: string;
};

async function ensureInvestmentLifecycleColumns() {
  try {
    const res = await db().execute(`PRAGMA table_info(investments)`);
    const names = new Set((res.rows as any[]).map((r) => String(r.name)));

    if (!names.has("status")) {
      await db().execute(`ALTER TABLE investments ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'`);
    }
    if (!names.has("closed_at")) {
      await db().execute(`ALTER TABLE investments ADD COLUMN closed_at TEXT`);
    }
    if (!names.has("final_value_minor")) {
      await db().execute(`ALTER TABLE investments ADD COLUMN final_value_minor INTEGER`);
    }
    if (!names.has("realized_gain_minor")) {
      await db().execute(`ALTER TABLE investments ADD COLUMN realized_gain_minor INTEGER`);
    }
  } catch {
    // ignore failures; assume schema already migrated
  }
}

export async function listInvestments(userId: string) {
  await ensureInvestmentLifecycleColumns();

  const res = await db().execute({
    sql: `SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return (res.rows as any[]).map((r) => ({
    ...r,
    units: r.units === null || r.units === undefined ? null : Number(r.units),
    final_value_minor: r.final_value_minor === null || r.final_value_minor === undefined ? null : Number(r.final_value_minor),
    realized_gain_minor:
      r.realized_gain_minor === null || r.realized_gain_minor === undefined ? null : Number(r.realized_gain_minor),
  })) as InvestmentRow[];
}

export async function getInvestment(userId: string, id: string) {
  await ensureInvestmentLifecycleColumns();

  const res = await db().execute({
    sql: `SELECT * FROM investments WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return null;
  return {
    ...row,
    units: row.units === null || row.units === undefined ? null : Number(row.units),
    final_value_minor: row.final_value_minor === null || row.final_value_minor === undefined ? null : Number(row.final_value_minor),
    realized_gain_minor:
      row.realized_gain_minor === null || row.realized_gain_minor === undefined ? null : Number(row.realized_gain_minor),
  } as InvestmentRow;
}

export async function createInvestment(input: {
  id: string;
  userId: string;
  name: string;
  type: string;
  provider?: string | null;
  note?: string | null;
  currency?: string;
  units?: number | null;
  status?: "ACTIVE" | "CLOSED";
  closedAt?: string | null;
  finalValueMinor?: number | null;
  realizedGainMinor?: number | null;
}) {
  await ensureInvestmentLifecycleColumns();

  await db().execute({
    sql: `
      INSERT INTO investments (id, user_id, name, type, provider, currency, units, note, status, closed_at, final_value_minor, realized_gain_minor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.name,
      input.type,
      input.provider ?? null,
      input.currency ?? "BDT",
      input.units ?? null,
      input.note ?? null,
      input.status ?? "ACTIVE",
      input.closedAt ?? null,
      input.finalValueMinor ?? null,
      input.realizedGainMinor ?? null,
    ],
  });
}

export async function updateInvestment(input: {
  userId: string;
  id: string;
  patch: Partial<{
    name: string;
    type: string;
    provider: string | null;
    currency: string;
    units: number | null;
    note: string | null;
    status: "ACTIVE" | "CLOSED";
    closed_at: string | null;
    final_value_minor: number | null;
    realized_gain_minor: number | null;
  }>;
}) {
  await ensureInvestmentLifecycleColumns();

  const allowed = [
    "name",
    "type",
    "provider",
    "currency",
    "units",
    "note",
    "status",
    "closed_at",
    "final_value_minor",
    "realized_gain_minor",
  ] as const;
  const sets: string[] = [];
  const args: any[] = [];
  for (const k of allowed) {
    if (k in input.patch) {
      sets.push(`${k} = ?`);
      // @ts-ignore
      args.push(input.patch[k]);
    }
  }
  if (!sets.length) return;
  sets.push(`updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

  await db().execute({
    sql: `UPDATE investments SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`,
    args: [...args, input.userId, input.id],
  });
}

export async function deleteInvestment(userId: string, id: string) {
  await ensureInvestmentLifecycleColumns();

  await db().execute({
    sql: `DELETE FROM investments WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}

export async function addInvestmentValue(input: {
  id: string;
  userId: string;
  investmentId: string;
  valueMinor: number;
  valuedAt: string; // ISO
}) {
  await ensureInvestmentLifecycleColumns();

  await db().execute({
    sql: `
      INSERT INTO investment_values (id, user_id, investment_id, value_minor, valued_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [input.id, input.userId, input.investmentId, input.valueMinor, input.valuedAt],
  });
}

export async function listInvestmentValues(input: {
  userId: string;
  investmentId: string;
  limit: number;
}) {
  await ensureInvestmentLifecycleColumns();

  const res = await db().execute({
    sql: `
      SELECT *
      FROM investment_values
      WHERE user_id = ? AND investment_id = ?
      ORDER BY valued_at DESC
      LIMIT ?
    `,
    args: [input.userId, input.investmentId, input.limit],
  });

  return (res.rows as any[]).map((r) => ({
    ...r,
    value_minor: Number(r.value_minor),
  })) as InvestmentValueRow[];
}

export async function getLatestInvestmentValueMinor(userId: string, investmentId: string) {
  await ensureInvestmentLifecycleColumns();

  const res = await db().execute({
    sql: `
      SELECT value_minor
      FROM investment_values
      WHERE user_id = ? AND investment_id = ?
      ORDER BY valued_at DESC
      LIMIT 1
    `,
    args: [userId, investmentId],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return 0;
  return Number(row.value_minor || 0);
}

export async function getEarliestInvestmentValue(userId: string, investmentId: string) {
  await ensureInvestmentLifecycleColumns();

  const res = await db().execute({
    sql: `
      SELECT *
      FROM investment_values
      WHERE user_id = ? AND investment_id = ?
      ORDER BY datetime(valued_at) ASC, datetime(created_at) ASC
      LIMIT 1
    `,
    args: [userId, investmentId],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return null;
  return {
    ...row,
    value_minor: Number(row.value_minor),
  } as InvestmentValueRow;
}

export { ensureInvestmentLifecycleColumns };
