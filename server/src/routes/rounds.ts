import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";

export const roundsRouter = Router();

function rowToRound(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    course: row.course as string,
    startingHole: row.starting_hole as number,
    players: JSON.parse(row.players as string),
    holes: JSON.parse(row.holes as string),
    totals: JSON.parse(row.totals as string),
    holeInOnePlayer: (row.hole_in_one_player as string) ?? null,
    puttOff: {
      used: Boolean(row.putt_off_used),
      winner: (row.putt_off_winner as string) ?? null,
    },
    winner: row.winner as string,
    losers: JSON.parse(row.losers as string),
  };
}

roundsRouter.get("/", async (_req, res) => {
  const result = await db.execute("SELECT * FROM rounds ORDER BY created_at DESC");
  res.json(result.rows.map((r) => rowToRound(r as unknown as Record<string, unknown>)));
});

roundsRouter.get("/:id", async (req, res) => {
  const result = await db.execute({ sql: "SELECT * FROM rounds WHERE id = ?", args: [req.params.id] });
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rowToRound(result.rows[0] as unknown as Record<string, unknown>));
});

/** Any player who was actually in the round can delete it — there's no
 * separate "host" concept once a round is finished and persisted, and this
 * is a casual friend-group app, not one with strict data ownership. */
roundsRouter.delete("/:id", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute({ sql: "SELECT players FROM rounds WHERE id = ?", args: [req.params.id] });
  if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

  const players: string[] = JSON.parse((result.rows[0] as unknown as { players: string }).players);
  if (!players.includes(user.name)) return res.status(403).json({ error: "You weren't in this round." });

  await db.execute({ sql: "DELETE FROM rounds WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});
