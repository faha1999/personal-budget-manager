import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";
import { MIGRATIONS } from "../src/server/db/migrations";

async function main() {
  const localDbPath = path.join(process.cwd(), ".data", "local.db");
  const url = process.env.TURSO_DATABASE_URL || `file:${localDbPath}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith("file:")) {
    const dir = path.dirname(localDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const client = createClient({ url, authToken });

  // Create migrations table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  for (const migration of MIGRATIONS) {
    const id = migration.id;
    const already = await client.execute({
      sql: `SELECT id FROM _migrations WHERE id = ? LIMIT 1`,
      args: [id],
    });

    if (already.rows.length > 0) {
      console.log(`✓ Skipped ${id}`);
      continue;
    }

    const sql = migration.sql.trim();
    if (!sql) {
      console.log(`- Empty migration ${id}, skipping...`);
      continue;
    }

    console.log(`→ Applying ${id}`);
    try {
      // Simple: run as a single statement batch.
      // If you need multiple statements, keep them separated with ';' and split.
      const statements = splitSqlStatements(sql);
      for (const stmt of statements) {
        const s = stmt.trim();
        if (!s) continue;
        try {
          await client.execute(s);
        } catch (err) {
          if (isIgnorableMigrationError(err)) continue;
          throw err;
        }
      }

      await client.execute({
        sql: `INSERT OR IGNORE INTO _migrations (id, applied_at) VALUES (?, ?)`,
        args: [id, new Date().toISOString()],
      });

      console.log(`✓ Applied ${id}`);
    } catch (err) {
      console.error(`✗ Failed ${id}`);
      throw err;
    }
  }

  await client.close();
  console.log("✅ Migrations complete.");
}

function splitSqlStatements(sql: string): string[] {
  // Minimal, pragmatic splitter (works for typical migration SQL).
  // Avoid semicolons inside strings in migrations or keep those statements separate.
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isIgnorableMigrationError(err: unknown) {
  const message = String((err as Error)?.message || "");
  return message.includes("duplicate column name");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
