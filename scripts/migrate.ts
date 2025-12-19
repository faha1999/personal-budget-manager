// TODO: Implement migration runner for Turso/SQLite using schema.sql or migrations folder.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";

async function main() {
  const localDbPath = path.join(process.cwd(), ".data", "local.db");
  const url = process.env.TURSO_DATABASE_URL || `file:${localDbPath}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith("file:")) {
    const dir = path.dirname(localDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const client = createClient({ url, authToken });

  const migrationsDir = path.join(process.cwd(), "src", "server", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  // Create migrations table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  for (const file of files) {
    const id = file;
    const already = await client.execute({
      sql: `SELECT id FROM _migrations WHERE id = ? LIMIT 1`,
      args: [id],
    });

    if (already.rows.length > 0) {
      console.log(`✓ Skipped ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    if (!sql) {
      console.log(`- Empty migration ${file}, skipping...`);
      continue;
    }

    console.log(`→ Applying ${file}`);
    try {
      // Simple: run as a single statement batch.
      // If you need multiple statements, keep them separated with ';' and split.
      const statements = splitSqlStatements(sql);
      for (const stmt of statements) {
        const s = stmt.trim();
        if (!s) continue;
        await client.execute(s);
      }

      await client.execute({
        sql: `INSERT INTO _migrations (id, applied_at) VALUES (?, ?)`,
        args: [id, new Date().toISOString()],
      });

      console.log(`✓ Applied ${file}`);
    } catch (err) {
      console.error(`✗ Failed ${file}`);
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
