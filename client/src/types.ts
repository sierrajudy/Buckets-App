export const AVATAR_KEYS = ["ball", "club", "tee", "beer", "bag", "flag", "cart", "cap"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export type RoomPhase = "lobby" | "playing" | "puttoff" | "celebration";

export interface Player {
  id: string;
  name: string;
  avatar: AvatarKey | null;
  connected: boolean;
}

export interface Spectator {
  id: string;
  name: string;
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
}

export interface RoundSummary {
  id: string;
  course: string;
  players: string[];
  startingHole: number;
  holes: HoleResult[];
  totals: Record<string, number>;
  holeInOnePlayer: string | null;
  puttOff: { used: boolean; winner: string | null };
  winner: string;
  losers: string[];
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
