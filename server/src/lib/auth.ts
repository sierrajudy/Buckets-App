import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import type { AvatarKey } from "../rooms/types.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailRoundStart: boolean;
  emailStandings: boolean;
  /** Their currently-equipped avatar costume piece (see achievements.ts's
   * COSTUME_SEQUENCE), or null if they haven't equipped anything. Carried
   * onto the Player object when they create/join/rejoin a room — see
   * roomStore.ts — so it renders live during a round, not just in their
   * own profile. */
  equippedCostume: string | null;
  /** A persistent, self-chosen avatar shown on their Profile and on
   * friends' view of them — separate from the avatar a player picks fresh
   * each round in a room's Lobby, which is never saved past that round.
   * NULL until they pick one in their profile. */
  profileAvatar: AvatarKey | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string): Promise<string> {
  const token = uuid();
  await db.execute({
    sql: "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
    args: [token, userId],
  });
  // Every signup/login funnels through here, so this is the one place that
  // needs to record "this user was active today" — see login_events in
  // db.ts and the "Creature of Habit" achievement. INSERT OR IGNORE since
  // logging in multiple times the same day should only count once.
  await db.execute({
    sql: "INSERT OR IGNORE INTO login_events (user_id, day) VALUES (?, date('now'))",
    args: [userId],
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
}

export function bearerToken(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function getUserByToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const result = await db.execute({
    sql: `SELECT users.id, users.email, users.name, users.email_round_start, users.email_standings, users.equipped_costume, users.profile_avatar FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token = ?`,
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return rowToAuthUser(result.rows[0] as unknown as Record<string, unknown>);
}

/** Looks a user up directly by id rather than by session token — used where
 * the caller already knows who they mean (e.g. a friend's id from the
 * friend_requests table) instead of authenticating a request. */
export async function getUserById(id: string): Promise<AuthUser | null> {
  const result = await db.execute({
    sql: `SELECT id, email, name, email_round_start, email_standings, equipped_costume, profile_avatar FROM users WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToAuthUser(result.rows[0] as unknown as Record<string, unknown>);
}

export function rowToAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    emailRoundStart: Boolean(row.email_round_start),
    emailStandings: Boolean(row.email_standings),
    equippedCostume: (row.equipped_costume as string | null) ?? null,
    profileAvatar: (row.profile_avatar as AvatarKey | null) ?? null,
  };
}
