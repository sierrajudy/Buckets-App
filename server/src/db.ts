import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "buckets.db")}`;
}

export const db: Client = createClient({
  url: resolveDbUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/** SQLite/libSQL has no "ADD COLUMN IF NOT EXISTS", so this just tries the
 * ALTER and swallows the "already exists" error on every restart after the
 * first. */
async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (!String(err instanceof Error ? err.message : err).toLowerCase().includes("duplicate column")) throw err;
  }
}

export async function initDb(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      course TEXT NOT NULL,
      starting_hole INTEGER NOT NULL,
      players TEXT NOT NULL,
      holes TEXT NOT NULL,
      totals TEXT NOT NULL,
      hole_in_one_player TEXT,
      putt_off_used INTEGER NOT NULL DEFAULT 0,
      putt_off_winner TEXT,
      winner TEXT NOT NULL,
      losers TEXT NOT NULL
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rounds_created ON rounds(created_at)`);

  await addColumnIfMissing("rounds", "game_mode", "TEXT NOT NULL DEFAULT 'standard'");
  await addColumnIfMissing("rounds", "teams", "TEXT"); // JSON [[p1,p2],[p3,p4]], highlow only
  await addColumnIfMissing("rounds", "winners", "TEXT NOT NULL DEFAULT '[]'"); // JSON string[]
  await addColumnIfMissing("rounds", "high_low", "TEXT"); // JSON HighLowMatchResult, highlow only

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await addColumnIfMissing("users", "email_round_start", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("users", "email_standings", "INTEGER NOT NULL DEFAULT 0");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
