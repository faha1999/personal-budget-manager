import { db } from "@/server/db/client";

export type ReceivableRow = {
  id: string;
  user_id: string;
  person: string;
  principal_minor: number;
  outstanding_minor: number;
  start_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureReceivablesTables() {
  await db().execute(`
    CREATE TABLE IF NOT EXISTS receivables (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      person            TEXT NOT NULL,
      principal_minor   INTEGER NOT NULL,
      outstanding_minor INTEGER NOT NULL DEFAULT 0,
      start_date        TEXT,
      note              TEXT,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await db().execute(`CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON receivables(user_id);`);

  await db().execute(`
    CREATE TABLE IF NOT EXISTS receivable_payments (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      receivable_id   TEXT NOT NULL,
      amount_minor    INTEGER NOT NULL,
      received_at     TEXT NOT NULL,
      note            TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receivable_id) REFERENCES receivables(id) ON DELETE CASCADE
    );
  `);

  await db().execute(
    `CREATE INDEX IF NOT EXISTS idx_rec_pay_user_rec_date ON receivable_payments(user_id, receivable_id, received_at);`
  );
}

export async function listReceivables(userId: string) {
  try {
    await ensureReceivablesTables();
    const res = await db().execute({
      sql: `SELECT * FROM receivables WHERE user_id = ? ORDER BY datetime(created_at) DESC`,
      args: [userId],
    });
    return (res.rows as any[]).map((r) => ({
      ...r,
      principal_minor: Number(r.principal_minor),
      outstanding_minor: Number(r.outstanding_minor),
    })) as ReceivableRow[];
  } catch {
    // Table might not exist yet (pre-migration); return empty to avoid crashes.
    return [];
  }
}

export async function getReceivable(userId: string, id: string) {
  try {
    await ensureReceivablesTables();
    const res = await db().execute({
      sql: `SELECT * FROM receivables WHERE user_id = ? AND id = ? LIMIT 1`,
      args: [userId, id],
    });
    const row = res.rows[0] as any | undefined;
    if (!row) return null;
    return {
      ...row,
      principal_minor: Number(row.principal_minor),
      outstanding_minor: Number(row.outstanding_minor),
    } as ReceivableRow;
  } catch {
    return null;
  }
}

export async function createReceivable(input: {
  id: string;
  userId: string;
  person: string;
  principalMinor: number;
  startDate?: string | null;
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO receivables (id, user_id, person, principal_minor, outstanding_minor, start_date, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.person,
      input.principalMinor,
      input.principalMinor,
      input.startDate ?? null,
      input.note ?? null,
    ],
  });
}

export async function addReceivablePayment(input: {
  id: string;
  userId: string;
  receivableId: string;
  amountMinor: number;
  receivedAt: string;
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO receivable_payments (id, user_id, receivable_id, amount_minor, received_at, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [input.id, input.userId, input.receivableId, input.amountMinor, input.receivedAt, input.note ?? null],
  });
}

export async function listReceivablePayments(input: { userId: string; receivableId: string; limit: number; offset: number }) {
  const res = await db().execute({
    sql: `
      SELECT *
      FROM receivable_payments
      WHERE user_id = ? AND receivable_id = ?
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [input.userId, input.receivableId, input.limit, input.offset],
  });

  const items = (res.rows as any[]).map((r) => ({
    ...r,
    amount_minor: Number(r.amount_minor),
  }));

  const count = await db().execute({
    sql: `SELECT COUNT(1) as cnt FROM receivable_payments WHERE user_id = ? AND receivable_id = ?`,
    args: [input.userId, input.receivableId],
  });

  return { items, total: Number((count.rows[0] as any).cnt || 0) };
}

export async function getReceivablePaidTotalMinor(userId: string, receivableId: string) {
  const res = await db().execute({
    sql: `SELECT COALESCE(SUM(amount_minor), 0) as paid_minor FROM receivable_payments WHERE user_id = ? AND receivable_id = ?`,
    args: [userId, receivableId],
  });
  return Number((res.rows[0] as any).paid_minor || 0);
}

export async function recalcReceivableOutstanding(userId: string, receivableId: string) {
  const recRes = await db().execute({
    sql: `SELECT principal_minor FROM receivables WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [receivableId, userId],
  });
  if (recRes.rows.length === 0) return null;

  const principal_minor = Number((recRes.rows[0] as any)?.principal_minor ?? 0);
  const paid_minor = await getReceivablePaidTotalMinor(userId, receivableId);
  const outstanding_minor = Math.max(0, principal_minor - paid_minor);

  const now = new Date().toISOString();
  await db().execute({
    sql: `
      UPDATE receivables
      SET outstanding_minor = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    args: [outstanding_minor, now, receivableId, userId],
  });

  return { principal_minor, paid_minor, outstanding_minor };
}
