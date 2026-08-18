export const TOKEN_KEY = "buckets:auth";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return parse<AuthResponse>(res);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parse<AuthResponse>(res);
}

export async function fetchMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parse<{ user: AuthUser }>(res);
}

export async function logoutRequest(token: string): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export async function forgotPassword(email: string): Promise<{ ok: true }> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parse<{ ok: true }>(res);
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return parse<{ ok: true }>(res);
}
