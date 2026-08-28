export const AVATAR_KEYS = ["ball", "club", "tee", "beer", "bag", "flag", "cart", "cap"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export type RoomPhase = "lobby" | "playing" | "puttoff" | "celebration";

export type GameMode = "standard" | "highlow" | "wolf" | "baseball";

/** Exactly two teams of two player names, fixed for the whole round. */
export type Teams = [[string, string], [string, string]];

export interface Player {
  id: string;
  name: string;
  avatar: AvatarKey | null;
  connected: boolean;
  handicap: number;
  equippedCostume: string | null;
}

export interface Spectator {
  id: string;
  name: string;
}

export interface HighLowHoleOutcome {
  lowPlayers: [string, string];
  lowWinner: "team0" | "team1" | "tie";
  highPlayers: [string, string];
  highWinner: "team0" | "team1" | "tie";
  matchPoints: [number, number];
  bonusPoints: [number, number];
  teamPoints: [number, number];
  netStrokes: Record<string, number>;
}

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

export interface BaseballHoleOutcome {
  points: Record<string, number>;
  rankGroups: string[][] | null;
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
  highLow?: HighLowHoleOutcome;
  wolf?: WolfHoleOutcome;
  baseball?: BaseballHoleOutcome;
}

export interface HighLowMatchResult {
  front: { points: [number, number]; winner: 0 | 1 | null };
  back: { points: [number, number]; winner: 0 | 1 | null };
  overall: { points: [number, number]; winner: 0 | 1 | null };
}

export interface UnlockedAchievement {
  key: string;
  title: string;
  description: string;
  emoji: string;
}

export interface RoundSummary {
  id: string;
  course: string;
  hostName: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  totals: Record<string, number>;
  holeInOnePlayer: string | null;
  puttOff: { used: boolean; winner: string | null };
  winner: string;
  losers: string[];
  winners: string[];
  gameMode: GameMode;
  teams: Teams | null;
  highLow: HighLowMatchResult | null;
  newAchievements: Record<string, UnlockedAchievement[]>;
}

export interface CourseStats {
  teeLabel: string;
  totalYards: number;
  courseRating: number;
  slopeRating: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  courseId: string | null;
  course: string | null;
  courseStats: CourseStats | null;
  startingHole: number;
  players: Player[];
  spectators: Spectator[];
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

export interface StandingsRow {
  name: string;
  roundsPlayed: number;
  matchWins: number;
  holesWon: number;
  bucketsWon: number;
  pgeWon: number;
  totalPoints: number;
  beersOwed: number;
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
  holes: HoleResult[];
}

export interface CourseSearchResult {
  id: string;
  name: string;
  location: string;
}

export interface CourseTeeOption {
  key: string;
  label: string;
  courseRating: number;
  slopeRating: number;
  totalYards: number;
  parTotal: number;
}

export interface CourseTees {
  name: string;
  tees: CourseTeeOption[];
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number;
  target: number;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  unlockedCostumes: string[];
  equippedCostume: string | null;
}

export interface CourseSelection {
  id: string;
  name: string;
  pars: number[];
  yardages: number[];
  handicaps: number[];
  teeLabel: string;
  totalYards: number;
  courseRating: number;
  slopeRating: number;
}
