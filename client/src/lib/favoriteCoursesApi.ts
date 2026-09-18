import { getStoredToken } from "./authApi";

export interface FavoriteCourse {
  id: string;
  name: string;
  location: string | null;
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export async function fetchFavoriteCourses(): Promise<FavoriteCourse[]> {
  const res = await fetch("/api/favorite-courses", { headers: authHeaders() });
  return parse<FavoriteCourse[]>(res);
}

export async function addFavoriteCourse(course: FavoriteCourse): Promise<void> {
  await fetch("/api/favorite-courses", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(course),
  }).catch(() => {});
}

export async function removeFavoriteCourse(id: string): Promise<void> {
  await fetch(`/api/favorite-courses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).catch(() => {});
}
