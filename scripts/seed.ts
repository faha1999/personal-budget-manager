// TODO: Seed default categories and optional demo data.
import process from "node:process";
import { createClient } from "@libsql/client";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/shared/constants/categories";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const url = mustGetEnv("TURSO_DATABASE_URL");
  const authToken = mustGetEnv("TURSO_AUTH_TOKEN");

  const client = createClient({ url, authToken });

  // Optional: categories table (if you use it). Safe to run even if absent.
  // If you haven't created a categories table, this will fail—remove block or create table.
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,  -- INCOME | EXPENSE
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();

    for (const name of INCOME_CATEGORIES) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO categories (id, kind, name, created_at) VALUES (?, ?, ?, ?)`,
        args: [`income:${name}`, "INCOME", name, now],
      });
    }

    for (const name of EXPENSE_CATEGORIES) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO categories (id, kind, name, created_at) VALUES (?, ?, ?, ?)`,
        args: [`expense:${name}`, "EXPENSE", name, now],
      });
    }

    console.log("✅ Seeded categories.");
  } catch (e) {
    console.log("ℹ️ Skipped categories seed (table not used yet).");
  }

  // Optional demo user (only if you have users table)
  // Keep it disabled by default for security.
  if (process.env.SEED_DEMO_USER === "true") {
    try {
      const email = process.env.DEMO_USER_EMAIL ?? "demo@budget.local";
      const name = process.env.DEMO_USER_NAME ?? "Demo User";
      const passwordHash = process.env.DEMO_USER_PASSWORD_HASH ?? "";

      if (!passwordHash) {
        console.log("⚠️ DEMO_USER_PASSWORD_HASH missing; skipping demo user.");
      } else {
        const now = new Date().toISOString();
        await client.execute({
          sql: `
            INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          args: [`user:demo`, email.toLowerCase(), name, passwordHash, now, now],
        });
        console.log("✅ Seeded demo user.");
      }
    } catch {
      console.log("ℹ️ Skipped demo user seed (users table not available yet).");
    }
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
