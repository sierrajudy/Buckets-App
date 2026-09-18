import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserById, getUserByToken } from "../lib/auth.js";
import { areFriends } from "../lib/friends.js";
import type { HoleResult } from "../rooms/types.js";

export const myRoundsRouter = Router();

export interface RoundPlayerSummary {
  name: string;
  total: number;
  holesWon: number;
  buckets: number;
  pge: number;
  won: boolean;
  strokes: number;
  frontStrokes: number;
  /** null for an old 9-hole round that never had a back nine to sum. */
  backStrokes: number | null;
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
  holes: HoleResult[];
}

function summarizePlayers(players: string[], holes: HoleResult[], totals: Record<string, number>, winners: string[]) {
  const hasBackNine = holes.some((h) => h.holeNumber > 9);
  return players.map((name) => ({
    name,
    total: totals[name] ?? 0,
    holesWon: holes.filter((h) => h.holeWinners.includes(name)).length,
    buckets: holes.filter((h) => h.bucketWinners.includes(name)).length,
    pge: holes.filter((h) => h.pgeEnabled && h.pgeWinners.includes(name)).length,
    won: winners.includes(name),
    strokes: holes.reduce((sum, h) => sum + (h.strokes[name] ?? 0), 0),
    frontStrokes: holes.filter((h) => h.holeNumber <= 9).reduce((sum, h) => sum + (h.strokes[name] ?? 0), 0),
    backStrokes: hasBackNine
      ? holes.filter((h) => h.holeNumber > 9).reduce((sum, h) => sum + (h.strokes[name] ?? 0), 0)
      : null,
  }));
}

/** Builds one row from a raw `rounds` table record, from the given
 * perspective name's point of view (holeStrokes/buckets/pge/tiebreak/total
 * are all keyed to that one name, same as they always have been — see
 * players for everyone else's numbers in the same round). Shared by "my
 * rounds" and "rounds with a friend", which differ only in which rows they
 * bother building this for. */
function buildRow(raw: Record<string, unknown>, perspectiveName: string): RoundHistoryRow {
  const players: string[] = JSON.parse(raw.players as string);
  const holes: HoleResult[] = JSON.parse(raw.holes as string);
  const totals: Record<string, number> = JSON.parse(raw.totals as string);
  const winners: string[] = raw.winners ? JSON.parse(raw.winners as string) : [raw.winner as string];
  const puttOffUsed = Boolean(raw.putt_off_used);
  const puttOffWinner = (raw.putt_off_winner as string) ?? null;

  const holeStrokes = Array.from({ length: holes.length }, (_, i) => {
    const hole = holes.find((h) => h.holeNumber === i + 1);
    const strokes = hole?.strokes[perspectiveName];
    return strokes && strokes > 0 ? strokes : null;
  });
  const buckets = holes.filter((h) => h.bucketWinners.includes(perspectiveName)).length;
  const pge = holes.filter((h) => h.pgeEnabled && h.pgeWinners.includes(perspectiveName)).length;
  const tiebreak = puttOffUsed ? (puttOffWinner === perspectiveName ? "won" : "lost") : null;

  return {
    id: raw.id as string,
    date: raw.created_at as string,
    course: raw.course as string,
    holeStrokes,
    buckets,
    pge,
    tiebreak,
    total: totals[perspectiveName] ?? 0,
    won: winners.includes(perspectiveName),
    players: summarizePlayers(players, holes, totals, winners),
    holes,
  };
}

myRoundsRouter.get("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute("SELECT * FROM rounds ORDER BY created_at DESC");
  const rows: RoundHistoryRow[] = [];

  for (const raw of result.rows as unknown as Record<string, unknown>[]) {
    const players: string[] = JSON.parse(raw.players as string);
    if (!players.includes(user.name)) continue;
    rows.push(buildRow(raw, user.name));
  }

  res.json(rows);
});

/** Every round the signed-in user and a friend of theirs have both played
 * in — "games together", from the signed-in user's own perspective (see
 * buildRow). Friend-gated: this is still someone else's round history, just
 * narrowed to the overlap, so it only makes sense to show to someone they've
 * actually added. */
myRoundsRouter.get("/with/:friendUserId", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const isFriend = await areFriends(user.id, req.params.friendUserId);
  if (!isFriend) return res.status(403).json({ error: "You're not friends with that person." });

  const friend = await getUserById(req.params.friendUserId);
  if (!friend) return res.status(404).json({ error: "That person doesn't exist." });

  const result = await db.execute("SELECT * FROM rounds ORDER BY created_at DESC");
  const rows: RoundHistoryRow[] = [];

  for (const raw of result.rows as unknown as Record<string, unknown>[]) {
    const players: string[] = JSON.parse(raw.players as string);
    if (!players.includes(user.name) || !players.includes(friend.name)) continue;
    rows.push(buildRow(raw, user.name));
  }

  res.json(rows);
});
