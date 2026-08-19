import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";

export const myRoundsRouter = Router();

interface HoleResult {
  holeNumber: number;
  strokes: Record<string, number>;
  holeWinners: string[];
  bucketWinners: string[];
  pgeEnabled: boolean;
  pgeWinners: string[];
}

export interface RoundPlayerSummary {
  name: string;
  total: number;
  holesWon: number;
  buckets: number;
  pge: number;
  won: boolean;
  strokes: number;
}

export interface RoundHistoryRow {
  id: string;
  date: string;
  course: string;
  holeStrokes: (number | null)[];
  buckets: number;
  pge: number;
  tiebreak: "won" | "lost" | null;
  total: number;
  won: boolean;
  players: RoundPlayerSummary[];
}

function summarizePlayers(players: string[], holes: HoleResult[], totals: Record<string, number>, winner: string) {
  return players.map((name) => ({
    name,
    total: totals[name] ?? 0,
    holesWon: holes.filter((h) => h.holeWinners.includes(name)).length,
    buckets: holes.filter((h) => h.bucketWinners.includes(name)).length,
    pge: holes.filter((h) => h.pgeEnabled && h.pgeWinners.includes(name)).length,
    won: name === winner,
    strokes: holes.reduce((sum, h) => sum + (h.strokes[name] ?? 0), 0),
  }));
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

    const holeStrokes = Array.from({ length: holes.length }, (_, i) => {
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
      course: raw.course as string,
      holeStrokes,
      buckets,
      pge,
      tiebreak,
      total: totals[user.name] ?? 0,
      won: winner === user.name,
      players: summarizePlayers(players, holes, totals, winner),
    });
  }

  res.json(rows);
});
