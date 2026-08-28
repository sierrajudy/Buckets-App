import { db } from "../db.js";
import type { GameMode, HoleResult, UnlockedAchievement } from "../rooms/types.js";

/** The costume pieces unlock in this fixed order, one per achievement
 * earned — NOT tied to which specific achievement earned it, just how many
 * total you've earned so far (the 1st achievement you ever unlock, in
 * whatever order you happen to earn it, grants COSTUME_SEQUENCE[0]; the
 * 2nd grants COSTUME_SEQUENCE[1]; and so on). Keys here must match the
 * client's costumes.tsx exactly, one SVG accessory per key. Keep this in
 * sync if you add/reorder achievements — see ACHIEVEMENTS below, whose
 * length must equal this array's length (one costume per achievement). */
export const COSTUME_SEQUENCE = [
  "beanie",
  "sunglasses",
  "halo",
  "golf_visor",
  "mustache",
  "bowtie",
  "crown",
  "cape",
  "monocle",
  "party_hat",
  "wizard_hat",
  "medal",
] as const;

export type CostumeKey = (typeof COSTUME_SEQUENCE)[number];

export interface UserStats {
  totalRounds: number;
  roundsByMode: Record<GameMode, number>;
  modesPlayed: Set<GameMode>;
  eagleCount: number;
  doubleBogeyPlusCount: number;
  loneWolfWins: number;
  bucketWins: number;
  holeInOnes: number;
  losses: number;
}

/** Scans every round this player (by name — rounds store player names, not
 * user ids, same as myRounds.ts) has ever appeared in and derives every
 * counter an achievement's check() might need in one pass. Cheap enough to
 * just recompute on demand for an app this size instead of maintaining
 * running counters — same tradeoff myRounds.ts already makes. */
export async function computeUserStats(name: string): Promise<UserStats> {
  const result = await db.execute("SELECT * FROM rounds");
  const stats: UserStats = {
    totalRounds: 0,
    roundsByMode: { standard: 0, highlow: 0, wolf: 0, baseball: 0 },
    modesPlayed: new Set(),
    eagleCount: 0,
    doubleBogeyPlusCount: 0,
    loneWolfWins: 0,
    bucketWins: 0,
    holeInOnes: 0,
    losses: 0,
  };

  for (const raw of result.rows as unknown as Record<string, unknown>[]) {
    const players: string[] = JSON.parse(raw.players as string);
    if (!players.includes(name)) continue;

    const gameMode = (raw.game_mode as GameMode) ?? "standard";
    stats.totalRounds += 1;
    stats.roundsByMode[gameMode] = (stats.roundsByMode[gameMode] ?? 0) + 1;
    stats.modesPlayed.add(gameMode);

    const losers: string[] = raw.losers ? JSON.parse(raw.losers as string) : [];
    if (losers.includes(name)) stats.losses += 1;

    const holes: HoleResult[] = JSON.parse(raw.holes as string);
    for (const h of holes) {
      const strokes = h.strokes[name];
      if (!strokes || strokes <= 0) continue;
      if (h.par - strokes >= 2) stats.eagleCount += 1;
      if (strokes - h.par >= 2) stats.doubleBogeyPlusCount += 1;
      if (h.holeInOnePlayers.includes(name)) stats.holeInOnes += 1;
      if (h.bucketWinners.includes(name)) stats.bucketWins += 1;
      if (h.wolf && h.wolf.alone && h.wolf.wolfName === name && h.wolf.outcome === "teamA") {
        stats.loneWolfWins += 1;
      }
    }
  }

  return stats;
}

export async function countLoginDaysThisWeek(userId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM login_events WHERE user_id = ? AND day >= date('now', '-6 days')`,
    args: [userId],
  });
  return Number((result.rows[0] as unknown as { cnt: number }).cnt);
}

export interface AchievementProgress {
  earned: boolean;
  progress: number;
  target: number;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  emoji: string;
  check: (stats: UserStats, loginDaysThisWeek: number) => AchievementProgress;
}

const MODE_LABEL: Record<GameMode, string> = {
  standard: "Buckets",
  highlow: "High Low",
  wolf: "Wolf",
  baseball: "Baseball",
};

function capped(value: number, target: number): AchievementProgress {
  return { earned: value >= target, progress: Math.min(value, target), target };
}

/** Ordered easy -> hard on purpose — this is also roughly the order most
 * players will earn them in, which is what actually determines their
 * costume unlock order (see COSTUME_SEQUENCE's doc comment) even though
 * that order isn't enforced or guaranteed. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_tee",
    title: "First Tee",
    description: "Finish your first round, any mode.",
    emoji: "⛳",
    check: (s) => capped(s.totalRounds, 1),
  },
  {
    key: "pack_member",
    title: "Pack Member",
    description: "Play 1 round of Wolf.",
    emoji: "🐺",
    check: (s) => capped(s.roundsByMode.wolf, 1),
  },
  {
    key: "first_eagle",
    title: "First Eagle",
    description: "Card your first eagle.",
    emoji: "🦅",
    check: (s) => capped(s.eagleCount, 1),
  },
  {
    key: "hole_in_juan",
    title: "Hole in Juan",
    description: "Record a hole-in-one.",
    emoji: "🕳️",
    check: (s) => capped(s.holeInOnes, 1),
  },
  {
    key: "triple_play",
    title: "Triple Play",
    description: `Play at least one round of ${MODE_LABEL.highlow}, ${MODE_LABEL.wolf}, and ${MODE_LABEL.baseball}.`,
    emoji: "🎯",
    check: (s) => {
      const played = (["highlow", "wolf", "baseball"] as GameMode[]).filter((m) => s.modesPlayed.has(m)).length;
      return capped(played, 3);
    },
  },
  {
    key: "creature_of_habit",
    title: "Creature of Habit",
    description: "Open Buckets on 3 different days in the same week.",
    emoji: "📅",
    check: (_s, loginDays) => capped(loginDays, 3),
  },
  {
    key: "cut_cut_cut",
    title: "Cut! Cut! Cut!",
    description: "Rack up 5 double-bogey-or-worse holes.",
    emoji: "🪓",
    check: (s) => capped(s.doubleBogeyPlusCount, 5),
  },
  {
    key: "wolf_king",
    title: "Wolf King",
    description: "Win 3 holes as a lone wolf.",
    emoji: "👑",
    check: (s) => capped(s.loneWolfWins, 3),
  },
  {
    key: "bucket_list",
    title: "Bucket List",
    description: "Win 10 bucket challenges.",
    emoji: "🪣",
    check: (s) => capped(s.bucketWins, 10),
  },
  {
    key: "beer_money",
    title: "Beer Money",
    description: "Buy the beers (lose a round) 5 times.",
    emoji: "🍺",
    check: (s) => capped(s.losses, 5),
  },
  {
    key: "iron_wolf",
    title: "Iron Wolf",
    description: "Play 10 rounds of Wolf, ever.",
    emoji: "🥇",
    check: (s) => capped(s.roundsByMode.wolf, 10),
  },
  {
    key: "century_club",
    title: "Century Club",
    description: "Play 20 rounds, any mode.",
    emoji: "💯",
    check: (s) => capped(s.totalRounds, 20),
  },
];

if (ACHIEVEMENTS.length !== COSTUME_SEQUENCE.length) {
  throw new Error("ACHIEVEMENTS and COSTUME_SEQUENCE must stay the same length — one costume per achievement.");
}

/** Called after a round finishes (once per player in it) and on every
 * login (to catch the login-streak achievement, and as a cheap safety net
 * that retroactively awards anything a player already qualifies for).
 * Silently does nothing for a name that isn't a real user account (a
 * guest-only name that never signed up has nothing to award). Returns the
 * newly-earned achievement keys, if the caller wants to celebrate them —
 * nothing currently does, but the hook's there. */
export async function checkAndAwardAchievements(name: string): Promise<string[]> {
  const userRow = await db.execute({ sql: "SELECT id FROM users WHERE name = ? COLLATE NOCASE", args: [name] });
  const userId = (userRow.rows[0] as unknown as { id: string } | undefined)?.id;
  if (!userId) return [];

  const earnedRows = await db.execute({
    sql: "SELECT achievement_key FROM user_achievements WHERE user_id = ?",
    args: [userId],
  });
  const alreadyEarned = new Set(
    (earnedRows.rows as unknown as { achievement_key: string }[]).map((r) => r.achievement_key),
  );

  const stats = await computeUserStats(name);
  const loginDays = await countLoginDaysThisWeek(userId);

  const newlyEarned: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (alreadyEarned.has(def.key)) continue;
    if (def.check(stats, loginDays).earned) newlyEarned.push(def.key);
  }

  for (const key of newlyEarned) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO user_achievements (user_id, achievement_key) VALUES (?, ?)",
      args: [userId, key],
    });
  }

  return newlyEarned;
}

/** Checks every player from a just-finished round for newly-earned
 * achievements and returns them (with enough of their definition to
 * display — title/description/emoji) keyed by player name, for the
 * celebration screen's unlock popup — see roomStore.ts's
 * finalizeAndPersist, which awaits this and attaches the result to the
 * round before it's ever broadcast. Same "failures are logged, not
 * thrown" deal as notifyStandings/notifyRoundStarted: an achievements
 * hiccup should never affect the room finishing, it just means nobody
 * gets a popup that round — they still keep whatever they actually
 * earned, since checkAndAwardAchievements itself already committed it to
 * the DB before this could even fail. */
export async function checkAndAwardAchievementsForRound(names: string[]): Promise<Record<string, UnlockedAchievement[]>> {
  const result: Record<string, UnlockedAchievement[]> = {};
  try {
    const settled = await Promise.allSettled(
      names.map(async (name) => {
        const newlyEarnedKeys = await checkAndAwardAchievements(name);
        const items: UnlockedAchievement[] = newlyEarnedKeys
          .map((key) => ACHIEVEMENTS.find((a) => a.key === key))
          .filter((a): a is AchievementDef => Boolean(a))
          .map((a) => ({ key: a.key, title: a.title, description: a.description, emoji: a.emoji }));
        return [name, items] as const;
      }),
    );
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value[1].length > 0) result[s.value[0]] = s.value[1];
    }
  } catch (err) {
    console.error("Failed to check/award achievements:", err);
  }
  return result;
}
