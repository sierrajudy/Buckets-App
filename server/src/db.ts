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
  await addColumnIfMissing("rounds", "host_name", "TEXT NOT NULL DEFAULT ''"); // who could delete this round

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
  // Which costume piece (see costumes.ts on the client, achievements.ts on
  // the server — the key strings must match between them) the user has
  // equipped right now, one at a time. NULL until they equip something in
  // their profile's Closet, and always one they've actually unlocked.
  await addColumnIfMissing("users", "equipped_costume", "TEXT");

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

  // One row per achievement a user has actually earned — see
  // achievements.ts for the fixed definitions (not stored in the DB, just
  // in code) and for how earned_at order maps to which costume piece a
  // given unlock grants (the Nth achievement earned, chronologically,
  // always grants costume piece N, regardless of which achievement it
  // is — see COSTUME_SEQUENCE).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_key TEXT NOT NULL,
      earned_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, achievement_key)
    )
  `);

  // One row per user per calendar day they've logged in (signup counts as
  // day 1) — just a set of distinct days, not a count of logins, so
  // logging in five times in one day still only ever adds one row. Powers
  // the "Creature of Habit" achievement (3 distinct days within a week).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_events (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      PRIMARY KEY (user_id, day)
    )
  `);

  // A live room's full in-memory state, snapshotted on every change (see
  // saveRoomSnapshot) so a redeploy or crash can restore every in-progress
  // round exactly as it was instead of silently wiping it — see
  // loadRoomSnapshots, called once at startup before the server accepts
  // connections. One row per room code; overwritten in place, not appended.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS room_snapshots (
      code TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // One row per (user, room) they've ever created/joined/spectated/
  // rejoined — last_seen_at bumped every time, role overwritten with
  // whatever it most recently was. Powers "recent rounds" on the home
  // page: the room itself might still be live (click back in) or might
  // not (server restart with no snapshot, or just never checked) —
  // rooms.ts's /recent endpoint checks getRoom() live and only returns
  // ones that still resolve.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS room_memberships (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_code TEXT NOT NULL,
      role TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, room_code)
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_room_memberships_user ON room_memberships(user_id, last_seen_at)`,
  );

  // Friend requests — a row per direction. 'pending' until the recipient
  // accepts or declines; once accepted, the pair is mutual friends (see
  // friends.ts, which queries this from either side). Declining just
  // leaves the row as 'declined' rather than deleting it, mainly so a
  // re-request doesn't immediately re-spam someone who just said no —
  // see friends.ts for the actual cooldown logic around that.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      responded_at TEXT,
      UNIQUE(from_user_id, to_user_id)
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id, status)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id, status)`,
  );
}
