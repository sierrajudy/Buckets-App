import { Router } from "express";
import { db } from "../db.js";

export const standingsRouter = Router();

interface HoleResult {
  holeWinners: string[];
  bucketWinners: string[];
  pgeEnabled: boolean;
  pgeWinners: string[];
}

interface StandingsRow {
  name: string;
  roundsPlayed: number;
  matchWins: number;
  holesWon: number;
  bucketsWon: number;
  pgeWon: number;
  totalPoints: number;
  beersOwed: number;
}

standingsRouter.get("/", async (_req, res) => {
  const result = await db.execute("SELECT * FROM rounds");
  const byPlayer = new Map<string, StandingsRow>();

  function rowFor(name: string): StandingsRow {
    let row = byPlayer.get(name);
    if (!row) {
      row = { name, roundsPlayed: 0, matchWins: 0, holesWon: 0, bucketsWon: 0, pgeWon: 0, totalPoints: 0, beersOwed: 0 };
      byPlayer.set(name, row);
    }
    return row;
  }

  for (const raw of result.rows) {
    const players: string[] = JSON.parse(raw.players as string);
    const holes: HoleResult[] = JSON.parse(raw.holes as string);
    const totals: Record<string, number> = JSON.parse(raw.totals as string);
    const winner = raw.winner as string;
    const losers: string[] = JSON.parse(raw.losers as string);

    for (const name of players) {
      const row = rowFor(name);
      row.roundsPlayed += 1;
      row.totalPoints += totals[name] ?? 0;
      if (name === winner) row.matchWins += 1;
      if (losers.includes(name)) row.beersOwed += 1;
      for (const hole of holes) {
        if (hole.holeWinners.includes(name)) row.holesWon += 1;
        if (hole.bucketWinners.includes(name)) row.bucketsWon += 1;
        if (hole.pgeEnabled && hole.pgeWinners.includes(name)) row.pgeWon += 1;
      }
    }
  }

  const rows = Array.from(byPlayer.values()).map((r) => ({ ...r, totalPoints: Math.round(r.totalPoints * 100) / 100 }));
  res.json(rows);
});
