/**
 * Purge users whose data retention window has expired.
 */
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

function ensureLocalDbPath() {
  const localDbPath = path.join(process.cwd(), ".data", "local.db");
  const dir = path.dirname(localDbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return localDbPath;
}

async function getClient(): Promise<{ client: Client; targetLabel: string; isRemote: boolean }> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    return {
      client: createClient({ url, authToken }),
      targetLabel: url,
      isRemote: true,
    };
  }

  const localDbPath = ensureLocalDbPath();
  return {
    client: createClient({ url: `file:${localDbPath}` }),
    targetLabel: localDbPath,
    isRemote: false,
  };
}

async function main() {
  const { client, targetLabel, isRemote } = await getClient();

  try {
    await client.execute("PRAGMA foreign_keys = ON");
    const res = await client.execute(`
      DELETE FROM users
      WHERE data_expires_at IS NOT NULL
        AND data_expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
    `);
    const deleted = Number(res.rowsAffected ?? 0);
    console.log(
      `🧹 Purged ${deleted} expired users from ${isRemote ? "remote Turso" : "local SQLite"} (${targetLabel}).`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("❌ Failed to purge expired users:", error);
  process.exit(1);
});
