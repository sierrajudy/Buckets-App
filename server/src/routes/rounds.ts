import { Router } from "express";
import { db } from "../db.js";

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
