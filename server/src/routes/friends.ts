import { Router } from "express";
import { bearerToken, getUserByToken } from "../lib/auth.js";
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  getSuggestedFriends,
  removeFriend,
  respondToRequest,
  searchUsers,
  sendFriendRequest,
  sendFriendRequestByName,
} from "../lib/friends.js";

export const friendsRouter = Router();

friendsRouter.get("/", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const [friends, incoming, outgoing, suggested] = await Promise.all([
    getFriends(user.id),
    getIncomingRequests(user.id),
    getOutgoingRequests(user.id),
    getSuggestedFriends(user.id, user.name),
  ]);

  res.json({ friends, incoming, outgoing, suggested });
});

friendsRouter.get("/search", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const query = typeof req.query.q === "string" ? req.query.q : "";
  const results = await searchUsers(user.id, query);
  res.json(results);
});

friendsRouter.post("/request", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const toUserId = String(req.body?.toUserId ?? "");
  if (!toUserId) return res.status(400).json({ error: "Missing toUserId." });

  const result = await sendFriendRequest(user.id, toUserId);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, autoAccepted: result.autoAccepted });
});

friendsRouter.post("/request-by-name", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const name = String(req.body?.name ?? "");
  const result = await sendFriendRequestByName(user.id, name);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, autoAccepted: result.autoAccepted });
});

friendsRouter.post("/respond", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const requestId = String(req.body?.requestId ?? "");
  const accept = Boolean(req.body?.accept);
  if (!requestId) return res.status(400).json({ error: "Missing requestId." });

  const result = await respondToRequest(user.id, requestId, accept);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

friendsRouter.delete("/:friendUserId", async (req, res) => {
  const user = await getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });

  await removeFriend(user.id, req.params.friendUserId);
  res.json({ ok: true });
});
