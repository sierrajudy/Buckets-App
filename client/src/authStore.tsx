import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectSocket, disconnectSocket } from "./lib/socket";
import {
  fetchMe,
  login as loginRequest,
  logoutRequest,
  signup as signupRequest,
  TOKEN_KEY,
  updateEmailPreferences as updateEmailPreferencesRequest,
  updateProfileAvatar as updateProfileAvatarRequest,
  type AuthUser,
} from "./lib/authApi";

const ROOM_SESSION_KEY = "buckets:session";

type AuthStatus = "loading" | "authed" | "anon";

type Result = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signup: (email: string, password: string, name: string) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => void;
  updateEmailPreferences: (prefs: { emailRoundStart: boolean; emailStandings: boolean }) => Promise<Result>;
  updateProfileAvatar: (avatar: string | null) => Promise<Result>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setStatus("anon");
      return;
    }
    fetchMe(token)
      .then(({ user: me }) => {
        setUser(me);
        setStatus("authed");
        connectSocket(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setStatus("anon");
      });
  }, []);

  async function signup(email: string, password: string, name: string): Promise<Result> {
    try {
      const res = await signupRequest(email, password, name);
      localStorage.setItem(TOKEN_KEY, res.token);
      setUser(res.user);
      setStatus("authed");
      connectSocket(res.token);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }

  async function login(email: string, password: string): Promise<Result> {
    try {
      const res = await loginRequest(email, password);
      localStorage.setItem(TOKEN_KEY, res.token);
      setUser(res.user);
      setStatus("authed");
      connectSocket(res.token);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }

  function logout() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) logoutRequest(token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROOM_SESSION_KEY);
    disconnectSocket();
    window.location.reload();
  }

  async function updateEmailPreferences(prefs: { emailRoundStart: boolean; emailStandings: boolean }): Promise<Result> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Not signed in." };
    try {
      const res = await updateEmailPreferencesRequest(token, prefs);
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }

  async function updateProfileAvatar(avatar: string | null): Promise<Result> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Not signed in." };
    const previousAvatar = user?.profileAvatar ?? null;
    // Optimistic, same as the Closet's costume equip: every screen reading
    // user.profileAvatar updates the instant it's picked, and only rolls
    // back if the request actually fails.
    setUser((prev) => (prev ? { ...prev, profileAvatar: avatar } : prev));
    try {
      const res = await updateProfileAvatarRequest(token, avatar);
      setUser((prev) => (prev ? { ...prev, profileAvatar: res.profileAvatar } : prev));
      return { ok: true };
    } catch (err) {
      setUser((prev) => (prev ? { ...prev, profileAvatar: previousAvatar } : prev));
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }

  return (
    <AuthContext.Provider
      value={{ status, user, signup, login, logout, updateEmailPreferences, updateProfileAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
