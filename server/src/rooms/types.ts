export const AVATAR_KEYS = ["ball", "club", "tee", "beer", "bag", "flag", "cart", "cap"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export type RoomPhase = "lobby" | "playing" | "puttoff" | "celebration";

/** "standard" is the original free-for-all stroke-play mode (unnamed until
 * "highlow" needed something to be named against). More modes land here
 * over time — each one is a distinct scoring engine in gameLogic.ts, kept
 * behind this single discriminant so the room/round shape stays uniform. */
export type GameMode = "standard" | "highlow" | "wolf";

/** Exactly two teams of two player names, fixed for the whole round. Only
 * meaningful when gameMode is "highlow". */
export type Teams = [[string, string], [string, string]];

export interface Player {
  id: string;
  name: string;
  avatar: AvatarKey | null;
  connected: boolean;
  socketId: string | null;
  /** Only meaningful in "highlow" mode — the host sets this in the lobby
   * for each player before starting. 0 (scratch) otherwise. */
  handicap: number;
}

export interface Spectator {
  id: string;
  name: string;
  socketId: string | null;
}

export interface HoleEntry {
  holeNumber: number;
  par: number;
  /** 0 when the course has no GolfCourseAPI tee data (e.g. the bootstrap default). */
  yardage: number;
  handicap: number;
  strokes: Record<string, number | null>; // keyed by player name
  bucketWinners: string[];
  pgeEnabled: boolean;
  pgeWinners: string[];
  /** "wolf" mode only — the wolf's chosen partner for this hole, or null if
   * not yet decided (or going alone). Mutually exclusive with wolfAlone. */
  wolfPartner: string | null;
  /** "wolf" mode only — true once the wolf has chosen to play the hole
   * solo against the other three. */
  wolfAlone: boolean;
}

/** Per-hole High Low detail: each team's low scorer plays the other team's
 * low scorer for 1 point, same for the high scorers — a tie on either
 * matchup ("no blood") pays out nothing for that matchup rather than
 * splitting it. Birdie/eagle bonus points are separate, paid to a team
 * whenever either of its members earns one, win or lose their matchup.
 *
 * Low/high is decided by NET score (gross minus any handicap strokes the
 * player receives on this hole) — the four net scores are computed first,
 * then sorted into low/high per team, so a higher gross score can still
 * end up as a team's "low" player once a handicap stroke is applied. The
 * birdie/eagle bonus, in contrast, is always judged on the GROSS score —
 * a net birdie manufactured by a handicap stroke doesn't earn it. */
export interface HighLowHoleOutcome {
  lowPlayers: [string, string]; // [team0's low player, team1's low player]
  lowWinner: "team0" | "team1" | "tie";
  highPlayers: [string, string]; // [team0's high player, team1's high player]
  highWinner: "team0" | "team1" | "tie";
  matchPoints: [number, number]; // 0-2 total across both teams, from the two matchups
  bonusPoints: [number, number]; // birdie/eagle bonus, per team
  teamPoints: [number, number]; // matchPoints + bonusPoints — the hole's full team result
  /** Net strokes (gross minus handicap strokes received) per player name,
   * for the four players on the two teams. Equal to gross when a player
   * has a 0 handicap or doesn't receive a stroke on this hole. */
  netStrokes: Record<string, number>;
}

/** Per-hole Wolf detail. teamA is always the wolf's side (just the wolf when
 * going alone, wolf + partner otherwise); teamB is everyone else. outcome is
 * null until the wolf's choice is made AND all four strokes are in — there's
 * no partial result to show before that. points are the raw per-player Wolf
 * payout for the hole (1 each for a 2v2 win, 3 for a lone-wolf win, 1 each
 * for the three beating a lone wolf, 0 on a tie), already multiplied ×2 for
 * a birdie or ×3 for an eagle — each multiplier applies only to the
 * individual player who made it, not their whole side, and only scales
 * whatever that player already earned (so a birdie on a losing hole is still
 * 0 — there's nothing to double). */
export interface WolfHoleOutcome {
  wolfName: string;
  partner: string | null;
  alone: boolean;
  teamA: string[];
  teamB: string[];
  bestA: number | null;
  bestB: number | null;
  outcome: "teamA" | "teamB" | "tie" | null;
  points: Record<string, number>;
}

export interface HoleResult {
  holeNumber: number;
  par: number;
  yardage: number;
  handicap: number;
  strokes: Record<string, number>;
  isBirdie: boolean;
  isEagle: boolean;
  isHoleInOne: boolean;
  holeInOnePlayers: string[];
  holeWinners: string[];
  holePoints: Record<string, number>;
  bucketWinners: string[];
  bucketPoints: Record<string, number>;
  pgeEnabled: boolean;
  pgeWinners: string[];
  pgePoints: Record<string, number>;
  totalPoints: Record<string, number>;
  /** Only present when the room's gameMode is "highlow". */
  highLow?: HighLowHoleOutcome;
  /** Only present when the room's gameMode is "wolf". */
  wolf?: WolfHoleOutcome;
}

/** Front 9 / back 9 / overall are three separate matches in High Low —
 * winner is a team index, or null when that match is tied ("push"). */
export interface HighLowMatchResult {
  front: { points: [number, number]; winner: 0 | 1 | null };
  back: { points: [number, number]; winner: 0 | 1 | null };
  overall: { points: [number, number]; winner: 0 | 1 | null };
}

export interface RoundSummary {
  id: string;
  course: string;
  /** The host at the time this round finished — the only player allowed to
   * delete it afterward from the celebration screen. */
  hostName: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  totals: Record<string, number>;
  holeInOnePlayer: string | null;
  puttOff: { used: boolean; winner: string | null };
  winner: string;
  losers: string[];
  /** All players who actually won — a single-element array in "standard"
   * mode (same info as `winner`), both members of the winning team in
   * "highlow" mode, or empty on a tie. Use this instead of `winner` for
   * any per-player "did I win" check. */
  winners: string[];
  gameMode: GameMode;
  teams: Teams | null;
  highLow: HighLowMatchResult | null;
}

export interface Room {
  code: string;
  hostId: string;
  courseId: string | null;
  course: string | null;
  startingHole: number;
  players: Player[];
  spectators: Spectator[];
  /** Spectator id -> the player name they're predicting will win this round. */
  predictions: Record<string, string>;
  phase: RoomPhase;
  entries: Record<number, HoleEntry>; // keyed by hole number, 1 through the course's hole count
  puttOffWinner: string | null;
  finishedRound: RoundSummary | null;
  createdAt: number;
  currentStep: number;
  gameMode: GameMode;
  /** Set by the host in the lobby once gameMode is "highlow" — cleared
   * whenever the mode changes or the roster changes, so a stale pairing
   * can never carry into a game with different players. */
  teams: Teams | null;
  /** "wolf" mode only — the fixed 4-name rotation for the whole round,
   * decided once when the round starts: a random player for the first hole
   * played, then the other three in the room's roster order after that. The
   * wolf for the Nth hole played is wolfOrder[N % 4]. */
  wolfOrder: [string, string, string, string] | null;
}

export type PublicPlayer = Omit<Player, "socketId">;
export type PublicSpectator = Omit<Spectator, "socketId">;

export interface CourseStats {
  teeLabel: string;
  totalYards: number;
  courseRating: number;
  slopeRating: number;
}

export interface RoomStateForClient {
  code: string;
  hostId: string;
  courseId: string | null;
  course: string | null;
  courseStats: CourseStats | null;
  startingHole: number;
  players: PublicPlayer[];
  spectators: PublicSpectator[];
  predictions: Record<string, string>;
  phase: RoomPhase;
  results: HoleResult[];
  totals: Record<string, number>;
  tiedLeaders: string[];
  puttOffWinner: string | null;
  finishedRound: RoundSummary | null;
  currentStep: number;
  gameMode: GameMode;
  teams: Teams | null;
}
