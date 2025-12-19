/**
 * TODO: Implement accounts repository (CRUD) and helpers for balance calculations.
 */
import { db } from "@/server/db/client";

export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  type: string;
  currency: string;
  opening_balance_minor: number;
  created_at: string;
  updated_at: string;
};

export async function listAccounts(userId: string) {
  const res = await db().execute({
    sql: `SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });

  return (res.rows as any[]).map((r) => ({
    ...r,
    opening_balance_minor: Number(r.opening_balance_minor),
  })) as AccountRow[];
}

export async function getAccount(userId: string, id: string) {
  const res = await db().execute({
    sql: `SELECT * FROM accounts WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return null;
  return { ...row, opening_balance_minor: Number(row.opening_balance_minor) } as AccountRow;
}

export async function createAccount(input: {
  id: string;
  userId: string;
  name: string;
  bankName?: string | null;
  type: string;
  currency?: string;
  openingBalanceMinor?: number;
}) {
  await db().execute({
    sql: `
      INSERT INTO accounts (id, user_id, name, bank_name, type, currency, opening_balance_minor)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.name,
      input.bankName ?? null,
      input.type,
      input.currency ?? "BDT",
      input.openingBalanceMinor ?? 0,
    ],
  });
}

export async function updateAccount(input: {
  userId: string;
  id: string;
  patch: Partial<{
    name: string;
    bank_name: string | null;
    type: string;
    currency: string;
    opening_balance_minor: number;
  }>;
}) {
  const allowed = ["name", "bank_name", "type", "currency", "opening_balance_minor"] as const;

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
    sql: `UPDATE accounts SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args: [...args, input.id, input.userId],
  });
}

export async function deleteAccount(userId: string, id: string) {
  await db().execute({
    sql: `DELETE FROM accounts WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}

/**
 * Balance calculation:
 * opening_balance + income - expense (for account)
 */
export async function getAccountBalanceMinor(userId: string, accountId: string) {
  const acc = await getAccount(userId, accountId);
  if (!acc) return null;

  const res = await db().execute({
    sql: `
      SELECT
        COALESCE(SUM(CASE WHEN type='INCOME' THEN amount_minor ELSE 0 END), 0) as income_minor,
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount_minor ELSE 0 END), 0) as expense_minor
      FROM transactions
      WHERE user_id = ? AND account_id = ?
    `,
    args: [userId, accountId],
  });

  const row = res.rows[0] as any;
  const income = Number(row.income_minor || 0);
  const expense = Number(row.expense_minor || 0);

  return acc.opening_balance_minor + income - expense;
}
