import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";
import { getAllRooms, getRoom } from "../rooms/roomStore.js";

export const roomsRouter = Router();

/** Rooms this account has been part of — as host, player, or spectator —
 * most-recently-active first, filtered down to just the ones still actually
 * live in memory right now (a room with no snapshot after a restart, or one
 * that's just genuinely long finished and gone, both fall out here rather
 * than showing a dead link to click). This is what makes "get back into a
 * round" work from a lost session or a brand new device: it's keyed off the
 * account via room_memberships, not off anything in this browser's
 * localStorage. */
roomsRouter.get("/recent", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute({
    sql: `SELECT room_code, role, last_seen_at FROM room_memberships WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 20`,
    args: [user.id],
  });

  const rows: {
    code: string;
    role: string;
    lastSeenAt: string;
    phase: string;
    course: string | null;
    gameMode: string;
    players: string[];
  }[] = [];

  for (const raw of result.rows as unknown as Record<string, unknown>[]) {
    const code = raw.room_code as string;
    const room = getRoom(code);
    if (!room) continue;
    rows.push({
      code,
      role: raw.role as string,
      lastSeenAt: raw.last_seen_at as string,
      phase: room.phase,
      course: room.course,
      gameMode: room.gameMode,
      players: room.players.map((p) => p.name),
    });
  }

  res.json(rows);
});

/** Every currently-live room past the lobby, for the "watch a game" list —
 * not filtered to this account at all, since spectating is open to any
 * signed-in user. Lobby-phase rooms are excluded: there's nothing to watch
 * yet, and dropping a stranger into someone's setup screen before they've
 * even picked players isn't what "spectate a live game" means. */
roomsRouter.get("/active", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const rows = getAllRooms()
    .filter((r) => r.phase !== "lobby")
    .map((r) => ({
      code: r.code,
      phase: r.phase,
      course: r.course,
      gameMode: r.gameMode,
      players: r.players.map((p) => p.name),
      spectatorCount: r.spectators.length,
    }));

  res.json(rows);
});
