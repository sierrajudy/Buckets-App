import type { CourseSearchResult, CourseSelection, CourseTees, RoundHistoryRow, StandingsRow } from "../types";
import { getStoredToken } from "./authApi";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function jsonOrServerError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body?.error as string) || `Request failed: ${res.status}`);
  }
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

export async function deleteRound(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getStoredToken();
  const res = await fetch(`/api/rounds/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: (body?.error as string) || `Request failed: ${res.status}` };
  }
  return { ok: true };
}

export async function searchCourses(query: string): Promise<CourseSearchResult[]> {
  const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`);
  return jsonOrServerError<CourseSearchResult[]>(res);
}

export async function fetchCourseTees(id: string): Promise<CourseTees> {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`);
  return jsonOrServerError<CourseTees>(res);
}

export async function selectCourseTee(id: string, teeKey: string): Promise<CourseSelection> {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}/tee?key=${encodeURIComponent(teeKey)}`);
  return jsonOrServerError<CourseSelection>(res);
}
