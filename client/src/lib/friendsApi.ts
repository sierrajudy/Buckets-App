import { getStoredToken } from "./authApi";

export interface FriendUser {
  id: string;
  name: string;
  email: string;
}

export interface FriendsOverview {
  friends: FriendUser[];
  suggested: FriendUser[];
}

export type FriendStatus = "friends" | "none";

export interface SearchResultUser extends FriendUser {
  status: FriendStatus;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFriendsOverview(): Promise<FriendsOverview> {
  const res = await fetch("/api/friends", { headers: authHeaders() });
  return parse<FriendsOverview>(res);
}

export async function searchFriendCandidates(query: string): Promise<SearchResultUser[]> {
  const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  return parse<SearchResultUser[]>(res);
}

/** Adds a friend immediately — no request/accept step, either side sees the
 * other right away. */
export async function addFriend(toUserId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/friends/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ toUserId }),
    });
    return await parse<{ ok: true }>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function addFriendByName(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/friends/add-by-name", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name }),
    });
    return await parse<{ ok: true }>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function removeFriend(friendUserId: string): Promise<void> {
  await fetch(`/api/friends/${friendUserId}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
}
