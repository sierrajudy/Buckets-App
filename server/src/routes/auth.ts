import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import {
  bearerToken,
  createSession,
  deleteSession,
  getUserByToken,
  hashPassword,
  isValidEmail,
  verifyPassword,
} from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const name = String(req.body?.name ?? "").trim();

  if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (!name || name.length > 20) return res.status(400).json({ error: "Name must be 1-20 characters." });

  const existingEmail = await db.execute({
    sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });
  if (existingEmail.rows.length > 0) return res.status(400).json({ error: "An account with that email already exists." });

  const existingName = await db.execute({
    sql: "SELECT id FROM users WHERE name = ? COLLATE NOCASE",
    args: [name],
  });
  if (existingName.rows.length > 0) return res.status(400).json({ error: "That name is already taken." });

  const id = uuid();
  await db.execute({
    sql: "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    args: [id, email, name, hashPassword(password)],
  });

  const token = await createSession(id);
  res.status(201).json({ token, user: { id, email, name } });
});

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  const result = await db.execute({
    sql: "SELECT id, email, name, password_hash FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });
  const row = result.rows[0] as unknown as Record<string, unknown> | undefined;
  if (!row || !verifyPassword(password, row.password_hash as string)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = await createSession(row.id as string);
  res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
});

authRouter.post("/logout", async (req, res) => {
  const token = bearerToken(req);
  if (token) await deleteSession(token);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user });
});
