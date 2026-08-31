import { Router } from "express";
import { bearerToken, getUserByToken } from "../lib/auth.js";
import { addFriend, addFriendByName, getFriends, getSuggestedFriends, removeFriend, searchUsers } from "../lib/friends.js";

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

friendsRouter.delete("/:friendUserId", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  await removeFriend(user.id, req.params.friendUserId);
  res.json({ ok: true });
});
