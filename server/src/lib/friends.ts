import { v4 as uuid } from "uuid";
import { db } from "../db.js";

export interface FriendUser {
  id: string;
  name: string;
  email: string;
}

/** Everyone this user is mutually friends with — a friend_requests row in
 * either direction with status 'accepted' counts, since accepting makes the
 * relationship symmetric regardless of who originally sent it. */
export async function getFriends(userId: string): Promise<FriendUser[]> {
  const result = await db.execute({
    sql: `SELECT users.id, users.name, users.email
          FROM friend_requests
          JOIN users ON users.id = CASE WHEN friend_requests.from_user_id = ? THEN friend_requests.to_user_id ELSE friend_requests.from_user_id END
          WHERE friend_requests.status = 'accepted' AND (friend_requests.from_user_id = ? OR friend_requests.to_user_id = ?)
          ORDER BY users.name COLLATE NOCASE ASC`,
    args: [userId, userId, userId],
  });
  return result.rows as unknown as FriendUser[];
}

export interface PendingRequest {
  id: string;
  user: FriendUser;
  createdAt: string;
}

/** Requests sent TO this user that they haven't responded to yet. */
export async function getIncomingRequests(userId: string): Promise<PendingRequest[]> {
  const result = await db.execute({
    sql: `SELECT friend_requests.id, friend_requests.created_at, users.id as user_id, users.name, users.email
          FROM friend_requests JOIN users ON users.id = friend_requests.from_user_id
          WHERE friend_requests.to_user_id = ? AND friend_requests.status = 'pending'
          ORDER BY friend_requests.created_at DESC`,
    args: [userId],
  });
  return (result.rows as unknown as { id: string; created_at: string; user_id: string; name: string; email: string }[]).map(
    (r) => ({ id: r.id, createdAt: r.created_at, user: { id: r.user_id, name: r.name, email: r.email } }),
  );
}

/** Requests this user sent that the other person hasn't responded to yet —
 * shown so a repeat search doesn't look like nothing happened. */
export async function getOutgoingRequests(userId: string): Promise<PendingRequest[]> {
  const result = await db.execute({
    sql: `SELECT friend_requests.id, friend_requests.created_at, users.id as user_id, users.name, users.email
          FROM friend_requests JOIN users ON users.id = friend_requests.to_user_id
          WHERE friend_requests.from_user_id = ? AND friend_requests.status = 'pending'
          ORDER BY friend_requests.created_at DESC`,
    args: [userId],
  });
  return (result.rows as unknown as { id: string; created_at: string; user_id: string; name: string; email: string }[]).map(
    (r) => ({ id: r.id, createdAt: r.created_at, user: { id: r.user_id, name: r.name, email: r.email } }),
  );
}

export type SendRequestResult =
  | { ok: true; autoAccepted: boolean }
  | { ok: false; error: string };

/** Sends a friend request — or, if the other person already sent one to us
 * first, just accepts theirs instead of leaving two crossed pending rows
 * sitting there forever. Re-requesting after a decline is allowed (people's
 * minds change), which is why this is an upsert keyed on the row's own
 * unique (from, to) pair rather than a plain INSERT. */
export async function sendFriendRequest(fromId: string, toId: string): Promise<SendRequestResult> {
  if (fromId === toId) return { ok: false, error: "That's you." };

  const already = await db.execute({
    sql: `SELECT 1 FROM friend_requests WHERE status = 'accepted' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))`,
    args: [fromId, toId, toId, fromId],
  });
  if (already.rows.length > 0) return { ok: false, error: "You're already friends." };

  const reverse = await db.execute({
    sql: `SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'`,
    args: [toId, fromId],
  });
  if (reverse.rows.length > 0) {
    const requestId = (reverse.rows[0] as unknown as { id: string }).id;
    await db.execute({
      sql: `UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`,
      args: [requestId],
    });
    return { ok: true, autoAccepted: true };
  }

  await db.execute({
    sql: `INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at)
          VALUES (?, ?, ?, 'pending', datetime('now'))
          ON CONFLICT (from_user_id, to_user_id)
          DO UPDATE SET status = 'pending', created_at = datetime('now'), responded_at = NULL
          WHERE friend_requests.status != 'accepted'`,
    args: [uuid(), fromId, toId],
  });
  return { ok: true, autoAccepted: false };
}

/** Same as sendFriendRequest, but looked up by player name instead of user
 * id — the Lobby and Celebration screens only ever have a Room's Player
 * objects on hand (see QuickAddFriendButton), not user ids. Player names
 * are always real account names for anyone with an account (a guest simply
 * has no matching row, hence the "no account" error below), so this is a
 * safe, exact lookup rather than a fuzzy one. */
export async function sendFriendRequestByName(fromId: string, name: string): Promise<SendRequestResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Missing name." };
  const row = await db.execute({ sql: `SELECT id FROM users WHERE name = ?`, args: [trimmed] });
  if (row.rows.length === 0) return { ok: false, error: "No Buckets account with that name." };
  const toId = (row.rows[0] as unknown as { id: string }).id;
  return sendFriendRequest(fromId, toId);
}

export type RespondResult = { ok: true } | { ok: false; error: string };

/** Only the recipient of a still-pending request can respond to it. */
export async function respondToRequest(userId: string, requestId: string, accept: boolean): Promise<RespondResult> {
  const row = await db.execute({
    sql: `SELECT to_user_id, status FROM friend_requests WHERE id = ?`,
    args: [requestId],
  });
  if (row.rows.length === 0) return { ok: false, error: "That request doesn't exist anymore." };
  const r = row.rows[0] as unknown as { to_user_id: string; status: string };
  if (r.to_user_id !== userId) return { ok: false, error: "That request isn't yours to answer." };
  if (r.status !== "pending") return { ok: false, error: "That request was already handled." };

  await db.execute({
    sql: `UPDATE friend_requests SET status = ?, responded_at = datetime('now') WHERE id = ?`,
    args: [accept ? "accepted" : "declined", requestId],
  });
  return { ok: true };
}

/** Removes a mutual friendship outright (as opposed to declining, which just
 * leaves a 'declined' row) — either side can end it. */
export async function removeFriend(userId: string, otherUserId: string): Promise<void> {
  await db.execute({
    sql: `DELETE FROM friend_requests WHERE status = 'accepted' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))`,
    args: [userId, otherUserId, otherUserId, userId],
  });
}

/** Used to gate friend-only actions (like inviting someone into a room) —
 * a plain existence check rather than pulling either party's full row. */
export async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM friend_requests WHERE status = 'accepted' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))`,
    args: [userId, otherUserId, otherUserId, userId],
  });
  return result.rows.length > 0;
}

export type FriendStatus = "self" | "friends" | "pending_out" | "pending_in" | "none";

export interface SearchResultUser extends FriendUser {
  status: FriendStatus;
}

/** Looks up accounts by name or email — used for the search-and-request
 * flow. Deliberately requires a few characters so it can't be used to
 * casually browse the whole user table. */
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

  const statusRows = await db.execute({
    sql: `SELECT from_user_id, to_user_id, status FROM friend_requests WHERE from_user_id = ? OR to_user_id = ?`,
    args: [userId, userId],
  });
  const relations = statusRows.rows as unknown as { from_user_id: string; to_user_id: string; status: string }[];

  return candidates.map((c) => {
    const rel = relations.find((r) => r.from_user_id === c.id || r.to_user_id === c.id);
    let status: FriendStatus = "none";
    if (rel) {
      if (rel.status === "accepted") status = "friends";
      else if (rel.status === "pending") status = rel.from_user_id === userId ? "pending_out" : "pending_in";
      // a 'declined' row leaves status "none" — re-requesting is allowed
    }
    return { ...c, status };
  });
}

/** People this user has actually shared a round with, who aren't already a
 * friend (or a pending request either way) — the "quick add" list shown at
 * the start/end of a game, since asking someone you just played 18 holes
 * with to search your name feels like unnecessary friction. Reads straight
 * from the rounds table the same way myRounds.ts does. */
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
