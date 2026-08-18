import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string): Promise<string> {
  const token = uuid();
  await db.execute({
    sql: "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
    args: [token, userId],
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
}

export function bearerToken(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function getUserByToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const result = await db.execute({
    sql: `SELECT users.id, users.email, users.name FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token = ?`,
    args: [token],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as unknown as Record<string, unknown>;
  return { id: row.id as string, email: row.email as string, name: row.name as string };
}
