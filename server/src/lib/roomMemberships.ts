import { db } from "../db.js";

export type RoomMembershipRole = "player" | "spectator";

/** Upserts a (user, room) row — see room_memberships in db.ts. Called after
 * every create/join/spectate/rejoin so "recent rounds" on the home page can
 * find rooms this account has actually been part of, independent of
 * whatever is (or isn't) sitting in this particular browser's localStorage —
 * that's the whole point of it existing alongside the client's own session
 * recovery. Fire-and-forget: failing to record a membership should never
 * block someone from actually getting into the room. */
export function recordRoomMembership(userId: string, roomCode: string, role: RoomMembershipRole): void {
  db.execute({
    sql: `INSERT INTO room_memberships (user_id, room_code, role, last_seen_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT (user_id, room_code)
          DO UPDATE SET role = excluded.role, last_seen_at = excluded.last_seen_at`,
    args: [userId, roomCode, role],
  }).catch((err) => {
    console.error("Failed to record room membership:", err);
  });
}
