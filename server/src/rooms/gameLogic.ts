import type { HoleEntry, HoleResult, RoundSummary } from "./types.js";

const BASE_HOLE_POINTS = 2;
const BUCKET_POINTS = 1;
const PGE_POINTS = 1;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function splitPool(pool: number, winners: string[], players: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const share = winners.length > 0 ? pool / winners.length : 0;
  for (const p of players) result[p] = winners.includes(p) ? round2(share) : 0;
  return result;
}

function sumRecords(records: Record<string, number>[], players: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of players) out[p] = round2(records.reduce((acc, r) => acc + (r[p] ?? 0), 0));
  return out;
}

/**
 * A tie for lowest score splits the hole-win pool evenly among however many
 * players tied, which works the same way regardless of room size (2-4).
 */
export function computeHoleResult(entry: HoleEntry, players: string[]): HoleResult {
  const strokes: Record<string, number> = {};
  for (const p of players) {
    const v = entry.strokes[p];
    strokes[p] = typeof v === "number" && v > 0 ? v : 0;
  }

  const validPlayers = players.filter((p) => strokes[p] > 0);
  const minScore = validPlayers.length > 0 ? Math.min(...validPlayers.map((p) => strokes[p])) : 0;
  const holeWinners = validPlayers.filter((p) => strokes[p] === minScore);

  const underPar = entry.par - minScore;
  const multiplier = validPlayers.length > 0 && underPar >= 1 ? underPar + 1 : 1;
  const isBirdie = multiplier === 2;
  const isEagle = multiplier >= 3;

  const holeInOnePlayers = validPlayers.filter((p) => strokes[p] === 1);
  const isHoleInOne = holeInOnePlayers.length > 0;

  const holePool = BASE_HOLE_POINTS * multiplier;
  const holePoints = splitPool(holePool, holeWinners, players);

  const bucketPoints = splitPool(BUCKET_POINTS, entry.bucketWinners, players);

  const pgePoints = entry.pgeEnabled
    ? splitPool(PGE_POINTS, entry.pgeWinners, players)
    : Object.fromEntries(players.map((p) => [p, 0]));

  const totalPoints = sumRecords([holePoints, bucketPoints, pgePoints], players);

  return {
    holeNumber: entry.holeNumber,
    par: entry.par,
    strokes,
    multiplier,
    isBirdie,
    isEagle,
    isHoleInOne,
    holeInOnePlayers,
    holeWinners,
    holePoints,
    bucketWinners: entry.bucketWinners,
    bucketPoints,
    pgeEnabled: entry.pgeEnabled,
    pgeWinners: entry.pgeWinners,
    pgePoints,
    totalPoints,
  };
}

export function computeRunningTotals(holeResults: HoleResult[], players: string[]): Record<string, number> {
  return sumRecords(
    holeResults.map((h) => h.totalPoints),
    players,
  );
}

export function findHoleInOneWinner(holeResults: HoleResult[]): string | null {
  for (const h of holeResults) {
    if (h.holeInOnePlayers.length > 0) return h.holeInOnePlayers[0];
  }
  return null;
}

export function allHolesComplete(holeResults: HoleResult[], players: string[]): boolean {
  return holeResults.every((h) => players.every((p) => h.strokes[p] > 0));
}

/** Players tied for the highest running total — empty if there's a clear leader. */
export function findTiedLeaders(totals: Record<string, number>, players: string[]): string[] {
  if (players.length === 0) return [];
  const max = Math.max(...players.map((p) => totals[p] ?? 0));
  const leaders = players.filter((p) => (totals[p] ?? 0) === max);
  return leaders.length > 1 ? leaders : [];
}

export function buildHolesOrder(startingHole: number, holeCount: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < holeCount; i++) {
    order.push(((startingHole - 1 + i) % holeCount) + 1);
  }
  return order;
}

export function finalizeRound(params: {
  course: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  holeInOnePlayer: string | null;
  puttOffWinner: string | null;
}): RoundSummary {
  const { course, players, startingHole, holes, holeInOnePlayer, puttOffWinner } = params;
  const totals = computeRunningTotals(holes, players);

  let winner: string;
  let puttOffUsed = false;

  if (holeInOnePlayer) {
    winner = holeInOnePlayer;
  } else {
    const tied = findTiedLeaders(totals, players);
    if (tied.length > 1 && puttOffWinner) {
      winner = puttOffWinner;
      puttOffUsed = true;
    } else {
      winner = players.reduce((best, p) => ((totals[p] ?? 0) > (totals[best] ?? 0) ? p : best), players[0]);
    }
  }

  const minTotal = Math.min(...players.map((p) => totals[p] ?? 0));
  const losers = players.filter((p) => p !== winner && (totals[p] ?? 0) === minTotal);

  return {
    course,
    players,
    startingHole,
    holes,
    totals,
    holeInOnePlayer,
    puttOff: { used: puttOffUsed, winner: puttOffUsed ? puttOffWinner : null },
    winner,
    losers: losers.length > 0 ? losers : players.filter((p) => p !== winner),
  };
}
