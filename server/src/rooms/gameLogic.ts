import { v4 as uuid } from "uuid";
import type {
  BaseballHoleOutcome,
  GameMode,
  HighLowHoleOutcome,
  HighLowMatchResult,
  HoleEntry,
  HoleResult,
  RoundSummary,
  Teams,
  WolfHoleOutcome,
} from "./types.js";

const BASE_HOLE_POINTS = 2;
const BIRDIE_BONUS = 1;
const EAGLE_BONUS = 2;
const BUCKET_POINTS = 1;
const PGE_POINTS = 1;

const HIGHLOW_BIRDIE_BONUS = 0.5;
const HIGHLOW_EAGLE_BONUS = 1;

const WOLF_TEAM_WIN_POINTS = 1; // each player on a winning 2v2 side
const WOLF_LONE_WOLF_WIN_POINTS = 3; // the wolf alone, beating the other three
const WOLF_LONE_WOLF_LOSS_POINTS = 1; // each of the three beating a lone wolf
const WOLF_BIRDIE_MULTIPLIER = 2;
const WOLF_EAGLE_MULTIPLIER = 3;

// 1st/2nd/3rd place, indexed by (rank - 1) — sums to 9, the hole's full pot.
const BASEBALL_PLACE_POINTS = [5, 3, 1];

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
 * Standard handicap stroke allocation: a player gets one stroke on every
 * hole whose stroke-index (difficulty ranking, 1 = hardest) falls within
 * their handicap, wrapping around for handicaps above the hole count (e.g.
 * a 20-handicap on an 18-hole course gets a stroke on every hole, plus a
 * second stroke on the 2 hardest).
 */
function strokesReceivedOnHole(handicap: number, holeStrokeIndex: number, holeCount: number): number {
  if (handicap <= 0 || holeCount <= 0) return 0;
  const fullRounds = Math.floor(handicap / holeCount);
  const remainder = handicap % holeCount;
  return fullRounds + (holeStrokeIndex <= remainder ? 1 : 0);
}

/**
 * A tie for lowest score splits the hole-win pool evenly among however many
 * players tied, which works the same way regardless of room size (2-4).
 * Birdie/eagle are flat bonus points paid to every player who earns them on
 * that hole, independent of who actually won the hole outright.
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

  const underPar = (p: string) => entry.par - strokes[p];
  const birdiePlayers = validPlayers.filter((p) => underPar(p) === 1);
  const eaglePlayers = validPlayers.filter((p) => underPar(p) >= 2);
  const isBirdie = birdiePlayers.length > 0;
  const isEagle = eaglePlayers.length > 0;

  const holeInOnePlayers = validPlayers.filter((p) => strokes[p] === 1);
  const isHoleInOne = holeInOnePlayers.length > 0;

  const holePoints = splitPool(BASE_HOLE_POINTS, holeWinners, players);
  const bonusPoints = Object.fromEntries(
    players.map((p) => [p, (birdiePlayers.includes(p) ? BIRDIE_BONUS : 0) + (eaglePlayers.includes(p) ? EAGLE_BONUS : 0)]),
  );

  const bucketPoints = splitPool(BUCKET_POINTS, entry.bucketWinners, players);

  const pgePoints = entry.pgeEnabled
    ? splitPool(PGE_POINTS, entry.pgeWinners, players)
    : Object.fromEntries(players.map((p) => [p, 0]));

  const totalPoints = sumRecords([holePoints, bonusPoints, bucketPoints, pgePoints], players);

  return {
    holeNumber: entry.holeNumber,
    par: entry.par,
    yardage: entry.yardage,
    handicap: entry.handicap,
    strokes,
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

/**
 * High Low match play: each team's low scorer plays the other team's low
 * scorer for 1 point, and the two high scorers play each other for the
 * other point. A tie on either matchup ("no blood") pays out nothing for
 * that matchup — it does NOT split like the standard mode's hole-win pool
 * does. Birdie/eagle bonus points are paid to a team whenever either
 * member earns one, independent of who wins their individual matchup.
 * Buckets and PG&E stay individual side games, exactly like standard mode.
 *
 * Handicaps: low/high is decided by NET score, not gross — all four net
 * scores are computed first, and only then sorted into low/high per team,
 * so a player who shot the higher gross score can still end up as their
 * team's low if a handicap stroke pulls their net score under. The
 * birdie/eagle bonus stays gross-only: a net birdie from a handicap stroke
 * doesn't earn it, only an actual gross birdie does.
 */
export function computeHighLowHoleResult(
  entry: HoleEntry,
  teams: Teams,
  players: string[],
  playerHandicaps: Record<string, number>,
  holeCount: number,
): HoleResult {
  const strokes: Record<string, number> = {};
  for (const p of players) {
    const v = entry.strokes[p];
    strokes[p] = typeof v === "number" && v > 0 ? v : 0;
  }

  const validPlayers = players.filter((p) => strokes[p] > 0);
  const underPar = (p: string) => entry.par - strokes[p];
  const birdiePlayers = validPlayers.filter((p) => underPar(p) === 1);
  const eaglePlayers = validPlayers.filter((p) => underPar(p) >= 2);
  const isBirdie = birdiePlayers.length > 0;
  const isEagle = eaglePlayers.length > 0;

  const holeInOnePlayers = validPlayers.filter((p) => strokes[p] === 1);
  const isHoleInOne = holeInOnePlayers.length > 0;

  const allScored = teams.flat().every((p) => strokes[p] > 0);

  // All four net scores, computed up front — before anyone is labeled
  // "low" or "high" — so handicap strokes are applied uniformly first.
  const netStrokes: Record<string, number> = {};
  for (const p of players) {
    const strokesGiven = strokesReceivedOnHole(playerHandicaps[p] ?? 0, entry.handicap, holeCount);
    netStrokes[p] = strokes[p] > 0 ? strokes[p] - strokesGiven : 0;
  }

  function lowHigh(team: [string, string]): { low: string; high: string } {
    const [p1, p2] = team;
    return netStrokes[p1] <= netStrokes[p2] ? { low: p1, high: p2 } : { low: p2, high: p1 };
  }

  let lowPlayers: [string, string] = [teams[0][0], teams[1][0]];
  let highPlayers: [string, string] = [teams[0][1], teams[1][1]];
  let lowWinner: HighLowHoleOutcome["lowWinner"] = "tie";
  let highWinner: HighLowHoleOutcome["highWinner"] = "tie";
  const matchPoints: [number, number] = [0, 0];

  if (allScored) {
    const a = lowHigh(teams[0]);
    const b = lowHigh(teams[1]);
    lowPlayers = [a.low, b.low];
    highPlayers = [a.high, b.high];

    if (netStrokes[a.low] < netStrokes[b.low]) {
      lowWinner = "team0";
      matchPoints[0] += 1;
    } else if (netStrokes[b.low] < netStrokes[a.low]) {
      lowWinner = "team1";
      matchPoints[1] += 1;
    }

    if (netStrokes[a.high] < netStrokes[b.high]) {
      highWinner = "team0";
      matchPoints[0] += 1;
    } else if (netStrokes[b.high] < netStrokes[a.high]) {
      highWinner = "team1";
      matchPoints[1] += 1;
    }
  }

  const bonusPoints: [number, number] = [0, 0];
  teams.forEach((team, i) => {
    for (const p of team) {
      if (birdiePlayers.includes(p)) bonusPoints[i] += HIGHLOW_BIRDIE_BONUS;
      if (eaglePlayers.includes(p)) bonusPoints[i] += HIGHLOW_EAGLE_BONUS;
    }
  });

  const teamPoints: [number, number] = [round2(matchPoints[0] + bonusPoints[0]), round2(matchPoints[1] + bonusPoints[1])];

  const bucketPoints = splitPool(BUCKET_POINTS, entry.bucketWinners, players);
  const pgePoints = entry.pgeEnabled
    ? splitPool(PGE_POINTS, entry.pgeWinners, players)
    : Object.fromEntries(players.map((p) => [p, 0]));

  const holePoints: Record<string, number> = {};
  teams.forEach((team, i) => {
    for (const p of team) holePoints[p] = teamPoints[i];
  });

  const totalPoints = sumRecords([holePoints, bucketPoints, pgePoints], players);

  const holeWinners =
    teamPoints[0] > teamPoints[1] ? [...teams[0]] : teamPoints[1] > teamPoints[0] ? [...teams[1]] : [];

  return {
    holeNumber: entry.holeNumber,
    par: entry.par,
    yardage: entry.yardage,
    handicap: entry.handicap,
    strokes,
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
    highLow: { lowPlayers, lowWinner, highPlayers, highWinner, matchPoints, bonusPoints, teamPoints, netStrokes },
  };
}

/**
 * Wolf: the wolf (rotates every hole — see Room.wolfOrder) either partners
 * with one other player or goes it alone against the other three. Whichever
 * side has the lower best gross score (no handicap in this mode) wins the
 * hole: 1 point each for a winning 2v2 side, 3 points for a lone wolf who
 * wins outright, or 1 point each for the three who beat a lone wolf. A tie
 * pays nothing. Birdie/eagle bonuses are individual, not team-wide — they
 * multiply (not add to) whatever points that specific player already earned
 * from the hole's outcome, ×2 for a birdie and ×3 for an eagle, so a birdie
 * on a hole that player's side lost is still worth 0.
 */
export function computeWolfHoleResult(entry: HoleEntry, wolfName: string, players: string[]): HoleResult {
  const strokes: Record<string, number> = {};
  for (const p of players) {
    const v = entry.strokes[p];
    strokes[p] = typeof v === "number" && v > 0 ? v : 0;
  }

  const validPlayers = players.filter((p) => strokes[p] > 0);
  const underPar = (p: string) => entry.par - strokes[p];
  const birdiePlayers = validPlayers.filter((p) => underPar(p) === 1);
  const eaglePlayers = validPlayers.filter((p) => underPar(p) >= 2);
  const isBirdie = birdiePlayers.length > 0;
  const isEagle = eaglePlayers.length > 0;

  const holeInOnePlayers = validPlayers.filter((p) => strokes[p] === 1);
  const isHoleInOne = holeInOnePlayers.length > 0;

  const partner = entry.wolfAlone ? null : (entry.wolfPartner ?? null);
  const teamA = partner ? [wolfName, partner] : [wolfName];
  const teamB = players.filter((p) => !teamA.includes(p));

  const decided = entry.wolfAlone || Boolean(entry.wolfPartner);
  const allScored = players.every((p) => strokes[p] > 0);

  const points: Record<string, number> = Object.fromEntries(players.map((p) => [p, 0]));
  let bestA: number | null = null;
  let bestB: number | null = null;
  let outcome: WolfHoleOutcome["outcome"] = null;

  if (decided && allScored) {
    bestA = Math.min(...teamA.map((p) => strokes[p]));
    bestB = Math.min(...teamB.map((p) => strokes[p]));

    if (bestA < bestB) {
      outcome = "teamA";
      if (teamA.length === 1) points[teamA[0]] = WOLF_LONE_WOLF_WIN_POINTS;
      else for (const p of teamA) points[p] = WOLF_TEAM_WIN_POINTS;
    } else if (bestB < bestA) {
      outcome = "teamB";
      if (teamA.length === 1) for (const p of teamB) points[p] = WOLF_LONE_WOLF_LOSS_POINTS;
      else for (const p of teamB) points[p] = WOLF_TEAM_WIN_POINTS;
    } else {
      outcome = "tie";
    }
  }

  // Birdie/eagle bonus is shared across a whole team, not kept by whoever
  // made it: if a player partners up and their partner cards a birdie, both
  // of them get the doubled points for the hole (same for a 3-way team
  // taking on a lone wolf). Eagle takes priority over birdie if a team has
  // one of each.
  const teamAHasEagle = teamA.some((p) => eaglePlayers.includes(p));
  const teamAHasBirdie = teamA.some((p) => birdiePlayers.includes(p));
  const teamBHasEagle = teamB.some((p) => eaglePlayers.includes(p));
  const teamBHasBirdie = teamB.some((p) => birdiePlayers.includes(p));

  for (const p of players) {
    const onTeamA = teamA.includes(p);
    const hasEagle = onTeamA ? teamAHasEagle : teamBHasEagle;
    const hasBirdie = onTeamA ? teamAHasBirdie : teamBHasBirdie;
    if (hasEagle) points[p] *= WOLF_EAGLE_MULTIPLIER;
    else if (hasBirdie) points[p] *= WOLF_BIRDIE_MULTIPLIER;
  }

  const holeWinners = outcome === "teamA" ? [...teamA] : outcome === "teamB" ? [...teamB] : [];

  const bucketPoints = splitPool(BUCKET_POINTS, entry.bucketWinners, players);
  const pgePoints = entry.pgeEnabled
    ? splitPool(PGE_POINTS, entry.pgeWinners, players)
    : Object.fromEntries(players.map((p) => [p, 0]));

  const totalPoints = sumRecords([points, bucketPoints, pgePoints], players);

  return {
    holeNumber: entry.holeNumber,
    par: entry.par,
    yardage: entry.yardage,
    handicap: entry.handicap,
    strokes,
    isBirdie,
    isEagle,
    isHoleInOne,
    holeInOnePlayers,
    holeWinners,
    holePoints: points,
    bucketWinners: entry.bucketWinners,
    bucketPoints,
    pgeEnabled: entry.pgeEnabled,
    pgeWinners: entry.pgeWinners,
    pgePoints,
    totalPoints,
    wolf: { wolfName, partner, alone: entry.wolfAlone, teamA, teamB, bestA, bestB, outcome, points },
  };
}

/** Groups players by tied gross score (best/lowest first) and pays out the
 * hole's 9-point pot 5/3/1 by place — a tied group pools the points for
 * every place it occupies and splits them evenly, so e.g. a 2-way tie for
 * 1st shares the 5+3=8 point pool 4-and-4, leaving the solo 3rd place with
 * the last point untouched. */
function rankBaseballGroups(strokes: Record<string, number>, players: string[]): string[][] {
  const sorted = [...players].sort((a, b) => strokes[a] - strokes[b]);
  const groups: string[][] = [];
  for (const p of sorted) {
    const current = groups[groups.length - 1];
    if (current && strokes[current[0]] === strokes[p]) current.push(p);
    else groups.push([p]);
  }
  return groups;
}

/**
 * Baseball: exactly 3 players, gross strokes only (no handicap). The hole
 * is worth a flat 9 points, split 5/3/1 by finish — see rankBaseballGroups
 * for how ties pool and split that pot. Nothing else (no birdie/eagle
 * bonus, no buckets, no PG&E) factors into the points here.
 */
export function computeBaseballHoleResult(entry: HoleEntry, players: string[]): HoleResult {
  const strokes: Record<string, number> = {};
  for (const p of players) {
    const v = entry.strokes[p];
    strokes[p] = typeof v === "number" && v > 0 ? v : 0;
  }

  const validPlayers = players.filter((p) => strokes[p] > 0);
  const underPar = (p: string) => entry.par - strokes[p];
  const birdiePlayers = validPlayers.filter((p) => underPar(p) === 1);
  const eaglePlayers = validPlayers.filter((p) => underPar(p) >= 2);
  const isBirdie = birdiePlayers.length > 0;
  const isEagle = eaglePlayers.length > 0;

  const holeInOnePlayers = validPlayers.filter((p) => strokes[p] === 1);
  const isHoleInOne = holeInOnePlayers.length > 0;

  const allScored = players.every((p) => strokes[p] > 0);

  const points: Record<string, number> = Object.fromEntries(players.map((p) => [p, 0]));
  let rankGroups: string[][] | null = null;

  if (allScored) {
    rankGroups = rankBaseballGroups(strokes, players);
    let placeIndex = 0;
    for (const group of rankGroups) {
      const pot = BASEBALL_PLACE_POINTS.slice(placeIndex, placeIndex + group.length).reduce((a, b) => a + b, 0);
      const share = round2(pot / group.length);
      for (const p of group) points[p] = share;
      placeIndex += group.length;
    }
  }

  const holeWinners = rankGroups ? [...rankGroups[0]] : [];

  const bucketPoints = splitPool(BUCKET_POINTS, entry.bucketWinners, players);
  const pgePoints = entry.pgeEnabled
    ? splitPool(PGE_POINTS, entry.pgeWinners, players)
    : Object.fromEntries(players.map((p) => [p, 0]));

  const totalPoints = sumRecords([points, bucketPoints, pgePoints], players);

  return {
    holeNumber: entry.holeNumber,
    par: entry.par,
    yardage: entry.yardage,
    handicap: entry.handicap,
    strokes,
    isBirdie,
    isEagle,
    isHoleInOne,
    holeInOnePlayers,
    holeWinners,
    holePoints: points,
    bucketWinners: entry.bucketWinners,
    bucketPoints,
    pgeEnabled: entry.pgeEnabled,
    pgeWinners: entry.pgeWinners,
    pgePoints,
    totalPoints,
    baseball: { points, rankGroups },
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
  hostName: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  holeInOnePlayer: string | null;
  puttOffWinner: string | null;
  gameMode?: GameMode;
}): RoundSummary {
  const { course, hostName, players, startingHole, holes, holeInOnePlayer, puttOffWinner, gameMode = "standard" } = params;
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
    id: uuid(),
    course,
    hostName,
    players,
    startingHole,
    holes,
    totals,
    holeInOnePlayer,
    puttOff: { used: puttOffUsed, winner: puttOffUsed ? puttOffWinner : null },
    winner,
    losers: losers.length > 0 ? losers : players.filter((p) => p !== winner),
    winners: [winner],
    gameMode,
    teams: null,
    highLow: null,
  };
}

/**
 * High Low finalization: front 9 / back 9 / overall are three separate
 * matches, each decided purely by summed team match+bonus points (buckets
 * and PG&E don't count toward these — they're side games). A tied match
 * has no winner ("push") rather than forcing a decider; there's no
 * putt-off in this mode, and a hole-in-one doesn't auto-end the match the
 * way it does in standard mode — the ace still counts toward that hole's
 * low-matchup and bonus points as usual, that's all.
 */
export function finalizeHighLowRound(params: {
  course: string;
  hostName: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  teams: Teams;
}): RoundSummary {
  const { course, hostName, players, startingHole, holes, teams } = params;
  const totals = computeRunningTotals(holes, players);

  const perHoleTeamPoints = holes.map((h) => h.highLow?.teamPoints ?? ([0, 0] as [number, number]));

  function sumPoints(range: [number, number][]): [number, number] {
    return range.reduce((acc, p) => [round2(acc[0] + p[0]), round2(acc[1] + p[1])], [0, 0] as [number, number]);
  }
  function winnerOf(points: [number, number]): 0 | 1 | null {
    if (points[0] > points[1]) return 0;
    if (points[1] > points[0]) return 1;
    return null;
  }

  const front = sumPoints(perHoleTeamPoints.slice(0, Math.min(9, perHoleTeamPoints.length)));
  const back = sumPoints(perHoleTeamPoints.slice(9));
  const overall = sumPoints(perHoleTeamPoints);

  const overallWinner = winnerOf(overall);
  const winners = overallWinner !== null ? [...teams[overallWinner]] : [];
  const losers = overallWinner !== null ? [...teams[overallWinner === 0 ? 1 : 0]] : [];

  return {
    id: uuid(),
    course,
    hostName,
    players,
    startingHole,
    holes,
    totals,
    holeInOnePlayer: findHoleInOneWinner(holes),
    puttOff: { used: false, winner: null },
    winner: winners[0] ?? players[0],
    losers,
    winners,
    gameMode: "highlow",
    teams,
    highLow: {
      front: { points: front, winner: winnerOf(front) },
      back: { points: back, winner: winnerOf(back) },
      overall: { points: overall, winner: overallWinner },
    },
  };
}
