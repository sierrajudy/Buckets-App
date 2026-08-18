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
import { sendPasswordResetEmail } from "../lib/email.js";

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

authRouter.post("/forgot-password", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();

  if (isValidEmail(email)) {
    const result = await db.execute({
      sql: "SELECT id, name FROM users WHERE email = ? COLLATE NOCASE",
      args: [email],
    });
    const row = result.rows[0] as unknown as Record<string, unknown> | undefined;
    if (row) {
      const token = uuid();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await db.execute({
        sql: "INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)",
        args: [token, row.id as string, expiresAt],
      });
      const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, row.name as string, resetUrl);
    }
  }

  // Always respond the same way, whether or not that email has an account —
  // otherwise this endpoint could be used to check who has signed up.
  res.json({ ok: true });
});

authRouter.post("/reset-password", async (req, res) => {
  const token = String(req.body?.token ?? "");
  const password = String(req.body?.password ?? "");

  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  const result = await db.execute({
    sql: "SELECT user_id, expires_at FROM password_resets WHERE token = ?",
    args: [token],
  });
  const row = result.rows[0] as unknown as Record<string, unknown> | undefined;
  if (!row) return res.status(400).json({ error: "This reset link is invalid or has already been used." });

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM password_resets WHERE token = ?", args: [token] });
    return res.status(400).json({ error: "This reset link has expired. Request a new one." });
  }

  const userId = row.user_id as string;
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [hashPassword(password), userId],
  });
  await db.execute({ sql: "DELETE FROM password_resets WHERE user_id = ?", args: [userId] });
  await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [userId] });

  res.json({ ok: true });
});
