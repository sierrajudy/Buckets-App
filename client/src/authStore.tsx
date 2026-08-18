import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectSocket, disconnectSocket } from "./lib/socket";
import {
  fetchMe,
  login as loginRequest,
  logoutRequest,
  signup as signupRequest,
  TOKEN_KEY,
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

  return <AuthContext.Provider value={{ status, user, signup, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
