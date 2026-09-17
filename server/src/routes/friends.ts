import { Router } from "express";
import { db } from "../db.js";
import { bearerToken, getUserById, getUserByToken } from "../lib/auth.js";
import { addFriend, addFriendByName, areFriends, getFriends, getSuggestedFriends, removeFriend, searchUsers } from "../lib/friends.js";
import { ACHIEVEMENTS, computeUserStats, countLoginDaysThisWeek } from "../lib/achievements.js";

export const friendsRouter = Router();

friendsRouter.get("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const [friends, suggested] = await Promise.all([getFriends(user.id), getSuggestedFriends(user.id, user.name)]);

  res.json({ friends, suggested });
});

friendsRouter.get("/search", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const query = typeof req.query.q === "string" ? req.query.q : "";
  const results = await searchUsers(user.id, query);
  res.json(results);
});

friendsRouter.post("/add", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const toUserId = String(req.body?.toUserId ?? "");
  if (!toUserId) return res.status(400).json({ error: "Missing toUserId." });

  const result = await addFriend(user.id, toUserId);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

friendsRouter.post("/add-by-name", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const name = String(req.body?.name ?? "");
  const result = await addFriendByName(user.id, name);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

/** Read-only view of a friend's achievements — same shape achievements.ts's
 * own GET / builds for the signed-in user, minus anything equip-related
 * (costumes are personal customization, not something you'd browse on
 * someone else). Doesn't run the catch-and-award check the way viewing your
 * own achievements does — awarding someone something because a friend
 * happened to look at their profile would be a strange side effect; it'll
 * catch up next time they log in or check their own page, same as always. */
friendsRouter.get("/:friendUserId/achievements", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const isFriend = await areFriends(user.id, req.params.friendUserId);
  if (!isFriend) return res.status(403).json({ error: "You're not friends with that person." });

  const friend = await getUserById(req.params.friendUserId);
  if (!friend) return res.status(404).json({ error: "That person doesn't exist." });

  const earnedRows = await db.execute({
    sql: "SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC",
    args: [friend.id],
  });
  const earned = earnedRows.rows as unknown as { achievement_key: string; earned_at: string }[];
  const earnedAtByKey = new Map(earned.map((r) => [r.achievement_key, r.earned_at]));

  const stats = await computeUserStats(friend.name);
  const loginDays = await countLoginDaysThisWeek(friend.id);

  const achievements = ACHIEVEMENTS.map((def) => {
    const alreadyHasIt = earnedAtByKey.has(def.key);
    const progress = def.check(stats, loginDays);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      earned: alreadyHasIt,
      earnedAt: earnedAtByKey.get(def.key) ?? null,
      progress: alreadyHasIt ? progress.target : progress.progress,
      target: progress.target,
    };
  });

  res.json({ name: friend.name, achievements });
});

friendsRouter.delete("/:friendUserId", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  await removeFriend(user.id, req.params.friendUserId);
  res.json({ ok: true });
});
