import { useEffect, useState } from "react";
import { equipCostume, fetchAchievements } from "../lib/api";
import { AvatarIcon } from "./Avatars";
import { COSTUME_META, COSTUME_SEQUENCE, type CostumeKey } from "./costumes";
import type { AchievementsResponse } from "../types";

/** Achievements + the Closet (equip UI for unlocked avatar costume pieces).
 * Costumes unlock in a fixed sequence as you earn achievements — the 1st
 * one ever earned grants the 1st costume, the 2nd grants the 2nd, and so
 * on, regardless of which specific achievements they were (see the
 * server's achievements.ts). Locked achievements still show their title,
 * description, and progress — only the badge icon itself stays hidden
 * behind a lock until it's actually earned. */
export function Closet() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAchievements()
      .then(setData)
      .catch(() => setError("Couldn't load your achievements."));
  }, []);

  async function toggleEquip(costume: CostumeKey) {
    if (!data || busy) return;
    const next = data.equippedCostume === costume ? null : costume;
    setBusy(true);
    setError(null);
    try {
      await equipCostume(next);
      setData({ ...data, equippedCostume: next });
    } catch {
      setError("Couldn't update your costume — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading…</p>;

  const unlockedSet = new Set(data.unlockedCostumes);
  const earnedCount = data.achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center gap-4">
        <div className="w-20 h-20 shrink-0">
          <AvatarIcon avatar="ball" className="w-full h-full" costume={data.equippedCostume} />
        </div>
        <div className="min-w-0">
          <div className="font-bold">Your look</div>
          <div className="text-sm text-neutral-500">
            {data.equippedCostume ? COSTUME_META[data.equippedCostume as CostumeKey].label : "Nothing equipped"}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            This is just a costume preview — your actual avatar shape is still picked fresh each round in the
            lobby, and wears whatever's equipped here.
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <div className="text-sm font-semibold text-neutral-500 mb-2">
          Closet — {unlockedSet.size} of {COSTUME_SEQUENCE.length} unlocked
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {COSTUME_SEQUENCE.map((key) => {
            const unlocked = unlockedSet.has(key);
            const equipped = data.equippedCostume === key;
            return (
              <div
                key={key}
                className={`relative rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center ${
                  equipped
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : unlocked
                      ? "border-neutral-200 dark:border-neutral-700"
                      : "border-neutral-100 dark:border-neutral-800 opacity-50"
                }`}
              >
                <div className="w-12 h-12">
                  {unlocked ? (
                    <AvatarIcon avatar="ball" className="w-full h-full" costume={key} />
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xl">
                      🔒
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold">{COSTUME_META[key].label}</span>
                {equipped && (
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 tracking-wide">
                    EQUIPPED
                  </span>
                )}
                {unlocked && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleEquip(key)}
                    className={`mt-1 w-full rounded-lg py-1.5 text-xs font-bold disabled:opacity-50 ${
                      equipped
                        ? "border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {equipped ? "Unequip" : "Equip"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-neutral-500 mb-2">
          Achievements — {earnedCount} of {data.achievements.length}
        </div>
        <div className="space-y-2">
          {data.achievements.map((a) => (
            <div
              key={a.key}
              className={`rounded-xl border p-3 flex items-center gap-3 ${
                a.earned
                  ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl ${
                  a.earned ? "bg-white dark:bg-neutral-900" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                }`}
              >
                {a.earned ? a.emoji : "🔒"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-neutral-500">{a.description}</div>
                {!a.earned && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {a.progress} / {a.target}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
