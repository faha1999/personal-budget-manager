/**
 * Clean script to remove all data from the database while preserving the schema.
 * This safely deletes all records from all tables respecting foreign key constraints.
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

  console.log(`🧹 Starting database cleanup against ${isRemote ? "remote Turso" : "local SQLite"} (${targetLabel})...\n`);

  try {
    // Disable foreign key constraints temporarily
    await client.execute("PRAGMA foreign_keys = OFF");

    // Delete all data in order of foreign key dependencies (reverse of creation)
    const tables = [
      // Child tables first (those with foreign keys)
      "receivable_payments",
      "loan_payments",
      "goal_contributions",
      "investment_values",
      "transactions",
      "sessions",

      // Parent tables
      "receivables",
      "loans",
      "goals",
      "investments",
      "accounts",
      "users",

      // Optional tables
      "categories",
    ];

    let clearedCount = 0;

    for (const table of tables) {
      try {
        await client.execute(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}`);
        clearedCount++;
      } catch (err) {
        const msg = (err as Error)?.message || "";
        if (msg.includes("no such table")) {
          console.log(`⏭️  Skipped ${table} (doesn't exist or already empty)`);
          continue;
        }
        throw err;
      }
    }

    // Re-enable foreign key constraints
    await client.execute("PRAGMA foreign_keys = ON");

    console.log(`\n✨ Database cleanup complete!`);
    console.log(`📊 Cleaned ${clearedCount} tables - all data has been removed.`);
    console.log("📋 The database schema is intact and ready for new data.");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
