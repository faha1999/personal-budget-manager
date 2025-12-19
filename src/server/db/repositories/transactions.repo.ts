/**
 * TODO: Implement transaction repository (CRUD, filtering, pagination) scoped by userId.
 */
import { db } from "@/server/db/client";

type TxType = "INCOME" | "EXPENSE";

export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  type: TxType;
  category: string;
  amount_minor: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

export async function listTransactions(input: {
  userId: string;
  limit: number;
  offset: number;
  start?: string; // ISO
  end?: string; // ISO
  type?: TxType;
  category?: string;
  accountId?: string;
}) {
  const where: string[] = ["user_id = ?"];
  const args: any[] = [input.userId];

  if (input.start) {
    where.push("occurred_at >= ?");
    args.push(input.start);
  }
  if (input.end) {
    where.push("occurred_at <= ?");
    args.push(input.end);
  }
  if (input.type) {
    where.push("type = ?");
    args.push(input.type);
  }
  if (input.category) {
    where.push("category = ?");
    args.push(input.category);
  }
  if (input.accountId) {
    where.push("account_id = ?");
    args.push(input.accountId);
  }

  const sql = `
    SELECT *
    FROM transactions
    WHERE ${where.join(" AND ")}
    ORDER BY occurred_at DESC
    LIMIT ? OFFSET ?
  `;

  const res = await db().execute({
    sql,
    args: [...args, input.limit, input.offset],
  });

  const items = (res.rows as any[]).map((r) => ({
    ...r,
    amount_minor: Number(r.amount_minor),
  })) as TransactionRow[];

  // total for pagination
  const countRes = await db().execute({
    sql: `SELECT COUNT(1) as cnt FROM transactions WHERE ${where.join(" AND ")}`,
    args,
  });

  const total = Number((countRes.rows[0] as any).cnt || 0);
  return { items, total };
}

export async function createTransaction(input: {
  id: string;
  userId: string;
  accountId: string;
  type: TxType;
  category: string;
  amountMinor: number;
  note?: string | null;
  occurredAt: string; // ISO
}) {
  await db().execute({
    sql: `
      INSERT INTO transactions (
        id, user_id, account_id, type, category, amount_minor, note, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.accountId,
      input.type,
      input.category,
      input.amountMinor,
      input.note ?? null,
      input.occurredAt,
    ],
  });
}

export async function getTransactionById(input: { userId: string; id: string }) {
  const res = await db().execute({
    sql: `SELECT * FROM transactions WHERE id = ? AND user_id = ?`,
    args: [input.id, input.userId],
  });

  const row = res.rows[0] as any | undefined;
  if (!row) return null;

  return {
    ...row,
    amount_minor: Number(row.amount_minor),
  } as TransactionRow;
}

export async function updateTransaction(input: {
  userId: string;
  id: string;
  patch: Partial<{
    account_id: string;
    type: TxType;
    category: string;
    amount_minor: number;
    note: string | null;
    occurred_at: string;
  }>;
}) {
  const allowed = ["account_id", "type", "category", "amount_minor", "note", "occurred_at"] as const;

  const sets: string[] = [];
  const args: any[] = [];

  for (const k of allowed) {
    if (k in input.patch) {
      sets.push(`${k} = ?`);
      // @ts-ignore
      args.push(input.patch[k]);
    }
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

  await db().execute({
    sql: `
      UPDATE transactions
      SET ${sets.join(", ")}
      WHERE id = ? AND user_id = ?
    `,
    args: [...args, input.id, input.userId],
  });
}

export async function deleteTransaction(input: { userId: string; id: string }) {
  await db().execute({
    sql: `DELETE FROM transactions WHERE id = ? AND user_id = ?`,
    args: [input.id, input.userId],
  });
}
