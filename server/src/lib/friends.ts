import { v4 as uuid } from "uuid";
import { db } from "../db.js";

export interface FriendUser {
  id: string;
  name: string;
  email: string;
}

/** Everyone this user has added, or been added by — friend_requests still
 * has a "from"/"to" column for who initiated it, but there's no accept step
 * anymore (see addFriend below), so a row existing at all means both sides
 * already see each other as friends, regardless of direction. */
export async function getFriends(userId: string): Promise<FriendUser[]> {
  const result = await db.execute({
    sql: `SELECT users.id, users.name, users.email
          FROM friend_requests
          JOIN users ON users.id = CASE WHEN friend_requests.from_user_id = ? THEN friend_requests.to_user_id ELSE friend_requests.from_user_id END
          WHERE friend_requests.from_user_id = ? OR friend_requests.to_user_id = ?
          ORDER BY users.name COLLATE NOCASE ASC`,
    args: [userId, userId, userId],
  });
  return result.rows as unknown as FriendUser[];
}

export type AddFriendResult = { ok: true } | { ok: false; error: string };

/** Adds a mutual friendship immediately — no request/accept step. Either
 * side can already see the other in "Your friends" as soon as this returns.
 * Re-adding an existing friend, or adding someone who already added you, is
 * a harmless no-op (the upsert just leaves the existing row as it was). */
export async function addFriend(fromId: string, toId: string): Promise<AddFriendResult> {
  if (fromId === toId) return { ok: false, error: "That's you." };

  await db.execute({
    sql: `INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at, responded_at)
          VALUES (?, ?, ?, 'accepted', datetime('now'), datetime('now'))
          ON CONFLICT (from_user_id, to_user_id) DO NOTHING`,
    args: [uuid(), fromId, toId],
  });
  return { ok: true };
}

/** Same as addFriend, but looked up by player name instead of user id — the
 * Lobby and Celebration screens only ever have a Room's Player objects on
 * hand (see QuickAddFriendButton), not user ids. Player names are always
 * real account names for anyone with an account (a guest simply has no
 * matching row, hence the "no account" error below), so this is a safe,
 * exact lookup rather than a fuzzy one. */
export async function addFriendByName(fromId: string, name: string): Promise<AddFriendResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Missing name." };
  const row = await db.execute({ sql: `SELECT id FROM users WHERE name = ?`, args: [trimmed] });
  if (row.rows.length === 0) return { ok: false, error: "No Buckets account with that name." };
  const toId = (row.rows[0] as unknown as { id: string }).id;
  return addFriend(fromId, toId);
}

/** Removes a friendship outright — either side can end it. */
export async function removeFriend(userId: string, otherUserId: string): Promise<void> {
  await db.execute({
    sql: `DELETE FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)`,
    args: [userId, otherUserId, otherUserId, userId],
  });
}

/** Used to gate friend-only actions (like inviting someone into a room) —
 * a plain existence check rather than pulling either party's full row. */
export async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)`,
    args: [userId, otherUserId, otherUserId, userId],
  });
  return result.rows.length > 0;
}

export type FriendStatus = "friends" | "none";

export interface SearchResultUser extends FriendUser {
  status: FriendStatus;
}

/** Looks up accounts by name or email — used for the search-and-add flow.
 * Deliberately requires a few characters so it can't be used to casually
 * browse the whole user table. */
export async function searchUsers(userId: string, query: string): Promise<SearchResultUser[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // users.name and users.email are both declared COLLATE NOCASE in the
  // schema, so these LIKE comparisons are already case-insensitive without
  // needing it spelled out here.
  const result = await db.execute({
    sql: `SELECT id, name, email FROM users WHERE id != ? AND (name LIKE ? OR email LIKE ?) LIMIT 20`,
    args: [userId, `%${trimmed}%`, `%${trimmed}%`],
  });

  const candidates = result.rows as unknown as FriendUser[];
  if (candidates.length === 0) return [];

  const relationRows = await db.execute({
    sql: `SELECT from_user_id, to_user_id FROM friend_requests WHERE from_user_id = ? OR to_user_id = ?`,
    args: [userId, userId],
  });
  const relatedIds = new Set(
    (relationRows.rows as unknown as { from_user_id: string; to_user_id: string }[]).map((r) =>
      r.from_user_id === userId ? r.to_user_id : r.from_user_id,
    ),
  );

  return candidates.map((c) => ({ ...c, status: relatedIds.has(c.id) ? "friends" : "none" }));
}

/** People this user has actually shared a round with, who aren't already a
 * friend — the "quick add" list shown at the start/end of a game, since
 * asking someone you just played 18 holes with to search your name feels
 * like unnecessary friction. Reads straight from the rounds table the same
 * way myRounds.ts does. */
export async function getSuggestedFriends(userId: string, userName: string): Promise<FriendUser[]> {
  const roundsResult = await db.execute("SELECT players FROM rounds ORDER BY created_at DESC LIMIT 200");
  const coPlayerNames = new Set<string>();
  for (const raw of roundsResult.rows as unknown as { players: string }[]) {
    let players: string[];
    try {
      players = JSON.parse(raw.players);
    } catch {
      continue;
    }
    if (!players.some((n) => n.toLowerCase() === userName.toLowerCase())) continue;
    for (const n of players) {
      if (n.toLowerCase() !== userName.toLowerCase()) coPlayerNames.add(n);
    }
  }
  if (coPlayerNames.size === 0) return [];

  const placeholders = Array.from(coPlayerNames)
    .map(() => "?")
    .join(",");
  const usersResult = await db.execute({
    sql: `SELECT id, name, email FROM users WHERE id != ? AND name IN (${placeholders})`,
    args: [userId, ...coPlayerNames],
  });
  const matched = usersResult.rows as unknown as FriendUser[];
  if (matched.length === 0) return [];

  const relations = await db.execute({
    sql: `SELECT from_user_id, to_user_id FROM friend_requests WHERE (from_user_id = ? OR to_user_id = ?)`,
    args: [userId, userId],
  });
  const relatedIds = new Set(
    (relations.rows as unknown as { from_user_id: string; to_user_id: string }[]).map((r) =>
      r.from_user_id === userId ? r.to_user_id : r.from_user_id,
    ),
  );

  return matched.filter((u) => !relatedIds.has(u.id));
}
