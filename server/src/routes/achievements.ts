import { Router } from "express";
import type { Server } from "socket.io";
import { db } from "../db.js";
import { bearerToken, getUserByToken } from "../lib/auth.js";
import {
  ACHIEVEMENTS,
  COSTUME_SEQUENCE,
  checkAndAwardAchievements,
  computeUserStats,
  countLoginDaysThisWeek,
  type CostumeKey,
} from "../lib/achievements.js";
import { updateEquippedCostumeForName } from "../rooms/roomStore.js";
import { broadcast } from "../rooms/socketHandlers.js";

/** Takes the socket.io server so /equip can push a costume change into any
 * room the player currently has open live — see updateEquippedCostumeForName.
 * Without this, equipping something in Profile only shows up the next time
 * they create/join/rejoin a room, not in a room they're already sitting in. */
export function createAchievementsRouter(io: Server): Router {
  const achievementsRouter = Router();

  achievementsRouter.get("/", async (req, res) => {
    const user = await getUserByToken(bearerToken(req));
    if (!user) return res.status(401).json({ error: "Not signed in." });

    // Catches up anything already qualified for before rendering — covers
    // a user whose stats crossed a threshold from a round finished before
    // this feature existed, or before their name matched a user account.
    await checkAndAwardAchievements(user.name);

    const earnedRows = await db.execute({
      sql: "SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC",
      args: [user.id],
    });
    const earned = earnedRows.rows as unknown as { achievement_key: string; earned_at: string }[];
    const earnedAtByKey = new Map(earned.map((r) => [r.achievement_key, r.earned_at]));

    const stats = await computeUserStats(user.name);
    const loginDays = await countLoginDaysThisWeek(user.id);

    const achievements = ACHIEVEMENTS.map((def) => {
      const alreadyHasIt = earnedAtByKey.has(def.key);
      const progress = def.check(stats, loginDays);
      return {
        key: def.key,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
        // Once earned, always earned — user_achievements is the permanent
        // record. def.check() is only for live progress on a NOT-yet-earned
        // one; trusting its result here too would let a rolling-window
        // achievement (Creature of Habit's 7-day login streak) un-earn
        // itself the moment the stats that satisfied it age out.
        earned: alreadyHasIt,
        earnedAt: earnedAtByKey.get(def.key) ?? null,
        progress: alreadyHasIt ? progress.target : progress.progress,
        target: progress.target,
      };
    });

    // Unlock order follows earned_at, not ACHIEVEMENTS' fixed order — the
    // 1st achievement earned (chronologically, whichever one it happened to
    // be) grants COSTUME_SEQUENCE[0], the 2nd grants [1], etc.
    const unlockedCostumes = earned.slice(0, COSTUME_SEQUENCE.length).map((_, i) => COSTUME_SEQUENCE[i]);

    const userRow = await db.execute({ sql: "SELECT equipped_costume FROM users WHERE id = ?", args: [user.id] });
    const equippedCostume =
      ((userRow.rows[0] as unknown as { equipped_costume: string | null } | undefined)?.equipped_costume as
        | CostumeKey
        | null) ?? null;

    res.json({ achievements, unlockedCostumes, equippedCostume });
  });

  achievementsRouter.patch("/equip", async (req, res) => {
    const user = await getUserByToken(bearerToken(req));
    if (!user) return res.status(401).json({ error: "Not signed in." });

    const costume = req.body?.costume === null ? null : String(req.body?.costume ?? "");

    if (costume !== null) {
      if (!(COSTUME_SEQUENCE as readonly string[]).includes(costume)) {
        return res.status(400).json({ error: "Not a real costume piece." });
      }
      const earnedRows = await db.execute({
        sql: "SELECT achievement_key FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC",
        args: [user.id],
      });
      const unlockedCount = earnedRows.rows.length;
      const unlockedCostumes = COSTUME_SEQUENCE.slice(0, Math.min(unlockedCount, COSTUME_SEQUENCE.length));
      if (!unlockedCostumes.includes(costume as CostumeKey)) {
        return res.status(400).json({ error: "You haven't unlocked that one yet." });
      }
    }

    await db.execute({ sql: "UPDATE users SET equipped_costume = ? WHERE id = ?", args: [costume, user.id] });

    // Push it live into any room this player currently has open — see this
    // function's own doc comment for why this is needed at all. The
    // account itself is already updated at this point (see above), so a
    // broadcast failure for one room (a stale/broken one, say) must never
    // turn an equip that actually succeeded into a 500 the client reports
    // as a failure — worst case here is just that one room's players don't
    // see the new costume live, not that the equip itself is lost.
    try {
      const touchedRooms = updateEquippedCostumeForName(user.name, costume);
      for (const room of touchedRooms) broadcast(io, room);
    } catch (err) {
      console.error(`Equip succeeded but broadcasting it into a room failed for ${user.name}:`, err);
    }

    res.json({ ok: true, equippedCostume: costume });
  });

  return achievementsRouter;
}
