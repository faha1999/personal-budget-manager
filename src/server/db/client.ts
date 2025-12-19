import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

type ExecuteFn = (statement: string | { sql: string; args?: (string | number | null)[] }) => Promise<any>;
type DbHandle = (() => { execute: ExecuteFn }) & { execute: ExecuteFn };

const localDbPath = path.join(process.cwd(), ".data", "local.db");
const fallbackUrl = `file:${localDbPath}`;
const primaryUrl = process.env.TURSO_DATABASE_URL || fallbackUrl;
const primaryAuthToken = primaryUrl.startsWith("file:") ? undefined : process.env.TURSO_AUTH_TOKEN;

let primaryClient: Client | null = null;
let fallbackClient: Client | null = null;
let useFallback = false;
let warnedFallback = false;

const migrationsByUrl = new Map<string, Promise<void>>();

function ensureLocalDir(url: string) {
  if (!url.startsWith("file:")) return;
  const dir = path.dirname(url.replace("file:", ""));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildClient(url: string, authToken?: string) {
  ensureLocalDir(url);
  return createClient({ url, authToken });
}

async function getPrimaryClient() {
  if (!primaryClient) {
    primaryClient = buildClient(primaryUrl, primaryAuthToken);
  }
  return primaryClient;
}

async function getFallbackClient() {
  if (!fallbackClient) {
    fallbackClient = buildClient(fallbackUrl);
  }
  return fallbackClient;
}

function shouldFallback(err: unknown) {
  const code = (err as any)?.code ?? (err as any)?.cause?.code;
  const message = String((err as Error)?.message || "");
  return (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    message.includes("fetch failed") ||
    message.includes("Connect Timeout")
  );
}

async function ensureMigrations(url: string, client: Client) {
  if (!url.startsWith("file:")) return;

  let promise = migrationsByUrl.get(url);
  if (!promise) {
    promise = runMigrations(client);
    migrationsByUrl.set(url, promise);
  }
  return promise;
}

async function runMigrations(client: Client) {
  const migrationsDir = path.join(process.cwd(), "src", "server", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  for (const file of files) {
    const applied = await client.execute({
      sql: `SELECT id FROM _migrations WHERE id = ? LIMIT 1`,
      args: [file],
    });
    if (applied.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    const statements = splitSqlStatements(sql);

    for (const stmt of statements) {
      const s = stmt.trim();
      if (!s) continue;
      await client.execute(s);
    }

    await client.execute({
      sql: `INSERT INTO _migrations (id, applied_at) VALUES (?, ?)`,
      args: [file, new Date().toISOString()],
    });
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const dbClient = {
  execute: async (statement: string | { sql: string; args?: (string | number | null)[] }) => {
    const runWithClient = async (client: Client, url: string) => {
      await ensureMigrations(url, client);
      return client.execute(statement as any);
    };

    if (!useFallback) {
      try {
        const client = await getPrimaryClient();
        return await runWithClient(client, primaryUrl);
      } catch (err) {
        if (!shouldFallback(err) || primaryUrl.startsWith("file:")) {
          throw err;
        }
        useFallback = true;
        if (!warnedFallback) {
          warnedFallback = true;
          console.warn("[db] Primary connection failed, falling back to local SQLite (.data/local.db).", err);
        }
      }
    }

    const fallback = await getFallbackClient();
    return runWithClient(fallback, fallbackUrl);
  },
};

const dbHandle = (() => dbClient) as DbHandle;
dbHandle.execute = (statement) => dbClient.execute(statement);

export { dbHandle as db };
