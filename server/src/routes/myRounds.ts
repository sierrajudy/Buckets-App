import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";

export const myRoundsRouter = Router();

interface HoleResult {
  holeNumber: number;
  strokes: Record<string, number>;
  bucketWinners: string[];
  pgeEnabled: boolean;
  pgeWinners: string[];
}

export interface RoundHistoryRow {
  id: string;
  date: string;
  holeStrokes: (number | null)[];
  buckets: number;
  pge: number;
  tiebreak: "won" | "lost" | null;
  total: number;
  won: boolean;
}

myRoundsRouter.get("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute("SELECT * FROM rounds ORDER BY created_at DESC");
  const rows: RoundHistoryRow[] = [];

  for (const raw of result.rows as unknown as Record<string, unknown>[]) {
    const players: string[] = JSON.parse(raw.players as string);
    if (!players.includes(user.name)) continue;

    const holes: HoleResult[] = JSON.parse(raw.holes as string);
    const totals: Record<string, number> = JSON.parse(raw.totals as string);
    const winner = raw.winner as string;
    const puttOffUsed = Boolean(raw.putt_off_used);
    const puttOffWinner = (raw.putt_off_winner as string) ?? null;

    const holeStrokes = Array.from({ length: 9 }, (_, i) => {
      const hole = holes.find((h) => h.holeNumber === i + 1);
      const strokes = hole?.strokes[user.name];
      return strokes && strokes > 0 ? strokes : null;
    });
    const buckets = holes.filter((h) => h.bucketWinners.includes(user.name)).length;
    const pge = holes.filter((h) => h.pgeEnabled && h.pgeWinners.includes(user.name)).length;
    const tiebreak = puttOffUsed ? (puttOffWinner === user.name ? "won" : "lost") : null;

    rows.push({
      id: raw.id as string,
      date: raw.created_at as string,
      holeStrokes,
      buckets,
      pge,
      tiebreak,
      total: totals[user.name] ?? 0,
      won: winner === user.name,
    });
  }

  res.json(rows);
});
