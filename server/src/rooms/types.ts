export const AVATAR_KEYS = ["ball", "club", "tee", "beer", "bag", "flag", "cart", "cap"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export type RoomPhase = "lobby" | "playing" | "puttoff" | "celebration";

export interface Player {
  id: string;
  name: string;
  avatar: AvatarKey | null;
  connected: boolean;
  socketId: string | null;
}

export interface HoleEntry {
  holeNumber: number;
  par: number;
  strokes: Record<string, number | null>; // keyed by player name
  bucketWinners: string[];
  pgeEnabled: boolean;
  pgeWinners: string[];
}

export interface HoleResult {
  holeNumber: number;
  par: number;
  strokes: Record<string, number>;
  multiplier: number;
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

export interface Room {
  code: string;
  hostId: string;
  courseId: string;
  course: string;
  startingHole: number;
  players: Player[];
  phase: RoomPhase;
  entries: Record<number, HoleEntry>; // keyed by hole number, 1 through the course's hole count
  puttOffWinner: string | null;
  finishedRound: RoundSummary | null;
  createdAt: number;
  currentStep: number;
}

export type PublicPlayer = Omit<Player, "socketId">;

export interface RoomStateForClient {
  code: string;
  hostId: string;
  courseId: string;
  course: string;
  startingHole: number;
  players: PublicPlayer[];
  phase: RoomPhase;
  results: HoleResult[];
  totals: Record<string, number>;
  tiedLeaders: string[];
  puttOffWinner: string | null;
  finishedRound: RoundSummary | null;
  currentStep: number;
}
