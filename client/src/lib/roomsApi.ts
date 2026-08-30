import { getStoredToken } from "./authApi";

export interface RecentRoom {
  code: string;
  role: "player" | "spectator";
  lastSeenAt: string;
  phase: "lobby" | "playing" | "puttoff" | "celebration";
  course: string | null;
  gameMode: string;
  players: string[];
}

export interface ActiveRoom {
  code: string;
  phase: "lobby" | "playing" | "puttoff" | "celebration";
  course: string | null;
  gameMode: string;
  players: string[];
  spectatorCount: number;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

/** Rooms this account has actually been part of, most-recent first — see
 * GET /api/rooms/recent. Only ever returns rooms that are still live right
 * now (a finished/expired one just won't be in the list), so anything shown
 * here is always safe to click straight into. */
export async function fetchRecentRooms(): Promise<RecentRoom[]> {
  const token = getStoredToken();
  if (!token) return [];
  const res = await fetch("/api/rooms/recent", { headers: { Authorization: `Bearer ${token}` } });
  return parse<RecentRoom[]>(res);
}

/** Every currently-live room past the lobby, for "watch a game" — see
 * GET /api/rooms/active. */
export async function fetchActiveRooms(): Promise<ActiveRoom[]> {
  const token = getStoredToken();
  if (!token) return [];
  const res = await fetch("/api/rooms/active", { headers: { Authorization: `Bearer ${token}` } });
  return parse<ActiveRoom[]>(res);
}
