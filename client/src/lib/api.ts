import type { CourseSearchResult, CourseSelection, RoundHistoryRow, StandingsRow } from "../types";
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

export async function searchCourses(query: string): Promise<CourseSearchResult[]> {
  const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`);
  return jsonOrServerError<CourseSearchResult[]>(res);
}

export async function selectCourse(id: string): Promise<CourseSelection> {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`);
  return jsonOrServerError<CourseSelection>(res);
}
