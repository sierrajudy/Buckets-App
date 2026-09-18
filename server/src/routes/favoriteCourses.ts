import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";

export const favoriteCoursesRouter = Router();

export interface FavoriteCourse {
  id: string;
  name: string;
  location: string | null;
}

favoriteCoursesRouter.get("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const result = await db.execute({
    sql: "SELECT course_id as id, name, location FROM favorite_courses WHERE user_id = ? ORDER BY added_at DESC",
    args: [user.id],
  });
  res.json(result.rows as unknown as FavoriteCourse[]);
});

favoriteCoursesRouter.post("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const id = String(req.body?.id ?? "").trim();
  const name = String(req.body?.name ?? "").trim();
  const location = req.body?.location ? String(req.body.location).trim() : null;
  if (!id || !name) return res.status(400).json({ error: "Missing course id or name." });

  await db.execute({
    sql: `INSERT INTO favorite_courses (user_id, course_id, name, location, added_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT (user_id, course_id) DO UPDATE SET name = excluded.name, location = excluded.location`,
    args: [user.id, id, name, location],
  });
  res.json({ ok: true });
});

favoriteCoursesRouter.delete("/:id", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  await db.execute({
    sql: "DELETE FROM favorite_courses WHERE user_id = ? AND course_id = ?",
    args: [user.id, req.params.id],
  });
  res.json({ ok: true });
});
