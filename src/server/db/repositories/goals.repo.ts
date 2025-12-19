/**
 * TODO: Implement goals repository with contribution linkage and progress computation.
 */
import { db } from "@/server/db/client";

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  target_minor: number;
  saved_minor: number;
  status: "ACTIVE" | "COMPLETED";
  target_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function listGoals(userId: string) {
  const res = await db().execute({
    sql: `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });

  return (res.rows as any[]).map((r) => ({
    ...r,
    target_minor: Number(r.target_minor),
    saved_minor: Number(r.saved_minor ?? 0),
    status: (r.status as any) ?? "ACTIVE",
  })) as GoalRow[];
}

export async function getGoal(userId: string, id: string) {
  const res = await db().execute({
    sql: `SELECT * FROM goals WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = res.rows[0] as any | undefined;
  if (!row) return null;
  return {
    ...row,
    target_minor: Number(row.target_minor),
    saved_minor: Number(row.saved_minor ?? 0),
    status: (row.status as any) ?? "ACTIVE",
  } as GoalRow;
}

export async function createGoal(input: {
  id: string;
  userId: string;
  title: string;
  targetMinor: number;
  targetDate?: string | null;
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO goals (id, user_id, title, target_minor, target_date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      input.id,
      input.userId,
      input.title,
      input.targetMinor,
      input.targetDate ?? null,
      input.note ?? null,
    ],
  });
}

export async function updateGoal(input: {
  userId: string;
  id: string;
  patch: Partial<{ title: string; target_minor: number; target_date: string | null; note: string | null; status: "ACTIVE" | "COMPLETED" }>;
}) {
  const allowed = ["title", "target_minor", "target_date", "note", "status"] as const;
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
    sql: `UPDATE goals SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`,
    args: [...args, input.userId, input.id],
  });
}

export async function deleteGoal(userId: string, id: string) {
  await db().execute({
    sql: `DELETE FROM goals WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}

export async function addGoalContribution(input: {
  id: string;
  userId: string;
  goalId: string;
  amountMinor: number;
  contributedAt: string; // ISO
  note?: string | null;
}) {
  await db().execute({
    sql: `
      INSERT INTO goal_contributions (id, user_id, goal_id, amount_minor, contributed_at, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [input.id, input.userId, input.goalId, input.amountMinor, input.contributedAt, input.note ?? null],
  });
}

export async function listGoalContributions(input: {
  userId: string;
  goalId: string;
  limit: number;
  offset: number;
}) {
  const res = await db().execute({
    sql: `
      SELECT *
      FROM goal_contributions
      WHERE user_id = ? AND goal_id = ?
      ORDER BY contributed_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [input.userId, input.goalId, input.limit, input.offset],
  });

  const items = (res.rows as any[]).map((r) => ({
    ...r,
    amount_minor: Number(r.amount_minor),
  }));

  const count = await db().execute({
    sql: `SELECT COUNT(1) as cnt FROM goal_contributions WHERE user_id = ? AND goal_id = ?`,
    args: [input.userId, input.goalId],
  });

  return { items, total: Number((count.rows[0] as any).cnt || 0) };
}

export async function getGoalProgressMinor(userId: string, goalId: string) {
  const res = await db().execute({
    sql: `
      SELECT COALESCE(SUM(amount_minor), 0) as saved_minor
      FROM goal_contributions
      WHERE user_id = ? AND goal_id = ?
    `,
    args: [userId, goalId],
  });

  return Number((res.rows[0] as any).saved_minor || 0);
}

export async function recalcGoalProgress(userId: string, goalId: string) {
  const saved_minor = await getGoalProgressMinor(userId, goalId);

  const goalRes = await db().execute({
    sql: `SELECT target_minor FROM goals WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [goalId, userId],
  });
  const target_minor = Number((goalRes.rows[0] as any)?.target_minor ?? 0);
  const status: "ACTIVE" | "COMPLETED" =
    target_minor > 0 && saved_minor >= target_minor ? "COMPLETED" : "ACTIVE";

  const now = new Date().toISOString();
  await db().execute({
    sql: `
      UPDATE goals
      SET saved_minor = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    args: [saved_minor, status, now, goalId, userId],
  });

  return { saved_minor, status, target_minor };
}
