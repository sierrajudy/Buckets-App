import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../authStore";
import { equipCostume, fetchAchievements } from "../lib/api";
import { AVATAR_KEYS, AVATAR_META, AvatarIcon, type AvatarKey } from "./Avatars";
import { COSTUME_META, COSTUME_SEQUENCE, type CostumeKey } from "./costumes";
import { Skeleton, SkeletonRows } from "./Skeleton";
import type { AchievementsResponse } from "../types";

/** Achievements + the Closet (equip UI for unlocked avatar costume pieces).
 * Costumes unlock in a fixed sequence as you earn achievements — the 1st
 * one ever earned grants the 1st costume, the 2nd grants the 2nd, and so
 * on, regardless of which specific achievements they were (see the
 * server's achievements.ts). Locked achievements still show their title,
 * description, and progress — only the badge icon itself stays hidden
 * behind a lock until it's actually earned. */
export function Closet() {
  const { user, updateProfileAvatar } = useAuth();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

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

  async function handlePickAvatar(avatar: AvatarKey) {
    if (avatarBusy) return;
    setAvatarBusy(true);
    const next = user?.profileAvatar === avatar ? null : avatar;
    await updateProfileAvatar(next);
    setAvatarBusy(false);
  }

  if (error && !data) return <p className="text-sm text-danger-500">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
        <SkeletonRows count={4} />
      </div>
    );
  }

  const unlockedSet = new Set(data.unlockedCostumes);
  const earnedCount = data.achievements.filter((a) => a.earned).length;
  const profileAvatar = (user?.profileAvatar as AvatarKey | null) ?? null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 flex items-center gap-4">
        <div className="w-20 h-20 shrink-0">
          <AvatarIcon avatar={profileAvatar} className="w-full h-full" costume={data.equippedCostume} />
        </div>
        <div className="min-w-0">
          <div className="font-bold">Your look</div>
          <div className="text-sm text-neutral-500">
            {data.equippedCostume ? COSTUME_META[data.equippedCostume as CostumeKey].label : "Nothing equipped"}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            This is your profile picture — shown on your Profile and to friends. Your avatar SHAPE each round is
            still picked fresh in the lobby, but it always wears whatever's equipped here.
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger-500">{error}</p>}

      <div>
        <div className="text-sm font-semibold text-neutral-500 mb-2">Profile picture</div>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_KEYS.map((key) => {
            const selected = profileAvatar === key;
            return (
              <button
                key={key}
                type="button"
                disabled={avatarBusy}
                onClick={() => handlePickAvatar(key)}
                className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition-all disabled:opacity-50 ${
                  selected
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                    : "border-transparent hover:border-primary-300"
                }`}
              >
                <div className="w-12 h-12">
                  <AvatarIcon avatar={key} className="w-full h-full" costume={data.equippedCostume} />
                </div>
                <span className="text-[10px] font-medium text-neutral-500">{AVATAR_META[key].label}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
                    : unlocked
                      ? "border-neutral-200 dark:border-neutral-700"
                      : "border-neutral-100 dark:border-neutral-800 opacity-50"
                }`}
              >
                <div className="w-12 h-12">
                  {unlocked ? (
                    <AvatarIcon avatar="ball" className="w-full h-full" costume={key} />
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                      <Lock size={18} />
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold">{COSTUME_META[key].label}</span>
                {equipped && (
                  <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 tracking-wide">
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
                        : "bg-primary-600 hover:bg-primary-700 text-white"
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
                  ? "border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-950/40"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl ${
                  a.earned ? "bg-white dark:bg-neutral-900" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                }`}
              >
                {a.earned ? a.emoji : <Lock size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-neutral-500">{a.description}</div>
                {!a.earned && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
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
