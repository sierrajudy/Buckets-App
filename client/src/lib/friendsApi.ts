import { getStoredToken } from "./authApi";

export interface FriendUser {
  id: string;
  name: string;
  email: string;
}

export interface PendingRequest {
  id: string;
  user: FriendUser;
  createdAt: string;
}

export interface FriendsOverview {
  friends: FriendUser[];
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
  suggested: FriendUser[];
}

export type FriendStatus = "self" | "friends" | "pending_out" | "pending_in" | "none";

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

export async function sendFriendRequest(toUserId: string): Promise<{ ok: true; autoAccepted: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ toUserId }),
    });
    return await parse<{ ok: true; autoAccepted: boolean }>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function sendFriendRequestByName(name: string): Promise<{ ok: true; autoAccepted: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/friends/request-by-name", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name }),
    });
    return await parse<{ ok: true; autoAccepted: boolean }>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ requestId, accept }),
    });
    return await parse<{ ok: true }>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function removeFriend(friendUserId: string): Promise<void> {
  await fetch(`/api/friends/${friendUserId}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
}
