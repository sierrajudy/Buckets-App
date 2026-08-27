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
    winners: row.winners ? JSON.parse(row.winners as string) : [row.winner as string],
    gameMode: (row.game_mode as string) ?? "standard",
    teams: row.teams ? JSON.parse(row.teams as string) : null,
    highLow: row.high_low ? JSON.parse(row.high_low as string) : null,
    hostName: (row.host_name as string) ?? null,
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

/** Only the player who hosted the round can delete it — this removes it
 * from everyone's history and the standings, not just the deleter's, so
 * it isn't left open to any participant. */
roundsRouter.delete("/:id", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute({ sql: "SELECT host_name FROM rounds WHERE id = ?", args: [req.params.id] });
  if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

  const hostName = (result.rows[0] as unknown as { host_name: string }).host_name;
  if (hostName !== user.name) return res.status(403).json({ error: "Only the round's host can do this." });

  await db.execute({ sql: "DELETE FROM rounds WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});
