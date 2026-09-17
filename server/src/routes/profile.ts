import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";
import { AVATAR_KEYS } from "../rooms/types.js";

export const profileRouter = Router();

/** Sets the persistent avatar shown on this user's Profile and on friends'
 * view of them (see AuthUser.profileAvatar) — separate from the avatar
 * picked fresh each round in a room's Lobby. null clears it back to
 * unset. */
profileRouter.patch("/avatar", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const avatar = req.body?.avatar === null ? null : String(req.body?.avatar ?? "");
  if (avatar !== null && !(AVATAR_KEYS as readonly string[]).includes(avatar)) {
    return res.status(400).json({ error: "Not a real avatar." });
  }

  await db.execute({ sql: "UPDATE users SET profile_avatar = ? WHERE id = ?", args: [avatar, user.id] });
  res.json({ ok: true, profileAvatar: avatar });
});
