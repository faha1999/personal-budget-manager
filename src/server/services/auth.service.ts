/**
 * Handle auth flows (register/login/logout), password hashing, and session issuance.
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/server/db/client";
import { sanitizeEmail, sanitizeText } from "@/shared/security/sanitize";

function nowISO() {
  return new Date().toISOString();
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, stored);
  } catch {
    return false;
  }
}

export async function findUserByEmail(email: string) {
  const normalized = sanitizeEmail(email);
  if (!normalized) return null;

  const res = await db().execute({
    sql: `SELECT * FROM users WHERE email = ?`,
    args: [normalized],
  });
  return (res.rows[0] as any | undefined) ?? null;
}

export async function createUser(input: { email: string; name?: string | null; password: string }) {
  const email = sanitizeEmail(input.email);
  if (!email) throw new Error("Invalid email.");

  const existing = await findUserByEmail(email);
  if (existing) throw new Error("Email already registered.");

  const userId = randomId("usr");
  const passwordHash = await hashPassword(input.password);
  const safeName = input.name ? sanitizeText(input.name, { maxLength: 120 }) : null;

  await db().execute({
    sql: `
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `,
    args: [userId, email, safeName ?? null, passwordHash],
  });

  return userId;
}

export async function createSession(input: { userId: string; days?: number }) {
  const sessionToken = randomId("ses");
  const sessionId = hashSessionToken(sessionToken);
  const expiresAt = addDaysISO(input.days ?? 30);

  await db().execute({
    sql: `
      INSERT INTO sessions (id, user_id, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [sessionId, input.userId, expiresAt, nowISO()],
  });

  return { sessionId: sessionToken, expiresAt };
}

export async function deleteSessionByRawToken(rawToken: string) {
  const hashed = hashSessionToken(rawToken);
  try {
    await db().execute({
      sql: `DELETE FROM sessions WHERE id IN (?, ?)`,
      args: [hashed, rawToken],
    });
  } catch {
    // best-effort cleanup; swallow errors to avoid blocking logout
  }
}

export async function getSessionByRawToken(rawToken: string) {
  const hashed = hashSessionToken(rawToken);

  const fetchSession = async (token: string) => {
    const res = await db().execute({
      sql: `
        SELECT s.*, u.email, u.name
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
        LIMIT 1
      `,
      args: [token],
    });
    return res.rows[0] as any | undefined;
  };

  let row = await fetchSession(hashed);
  if (!row) {
    // Legacy support for pre-hashed session ids
    row = await fetchSession(rawToken);
  }
  if (!row) return null;

  // expired?
  const expiresAt = new Date(String(row.expires_at)).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    // cleanup expired session
    try {
      await db().execute({ sql: `DELETE FROM sessions WHERE id IN (?, ?)`, args: [hashed, rawToken] });
    } catch {
      // ignore cleanup failures
    }
    return null;
  }

  const storedId = String(row.id);

  // touch last_seen_at (best-effort)
  try {
    await db().execute({
      sql: `UPDATE sessions SET last_seen_at = ? WHERE id = ?`,
      args: [nowISO(), storedId],
    });
  } catch {
    // ignore heartbeat failures
  }

  return {
    sessionId: String(row.id),
    userId: String(row.user_id),
    expiresAt: String(row.expires_at),
    user: {
      id: String(row.user_id),
      email: String(row.email),
      name: row.name ? String(row.name) : null,
    },
  };
}
