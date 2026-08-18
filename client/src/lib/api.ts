import type { RoundHistoryRow, StandingsRow } from "../types";
import { getStoredToken } from "./authApi";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchStandings(): Promise<StandingsRow[]> {
  const res = await fetch("/api/standings");
  return json<StandingsRow[]>(res);
}

export async function fetchMyRounds(): Promise<RoundHistoryRow[]> {
  const token = getStoredToken();
  const res = await fetch("/api/my-rounds", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return json<RoundHistoryRow[]>(res);
}
