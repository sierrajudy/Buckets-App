import { useEffect, useState } from "react";
import { useAuth } from "../authStore";
import { fetchAchievements, fetchMyRounds } from "../lib/api";
import { fetchFriendsOverview, type FriendUser } from "../lib/friendsApi";
import { RoundHistoryTable } from "./RoundHistoryTable";
import { EmailPreferences } from "./EmailPreferences";
import { Closet } from "./Closet";
import { AvatarIcon, type AvatarKey } from "./Avatars";
import { Skeleton, SkeletonRows } from "./Skeleton";
import type { RoundHistoryRow } from "../types";

export function Profile({
  onBack,
  onViewFriend,
  autoOpenEmailPrefs = false,
  autoOpenAvatarTab = false,
}: {
  onBack: () => void;
  /** Takes the viewer to that friend's own profile — standings,
   * achievements, and games played together (see FriendProfile.tsx). */
  onViewFriend: (friend: FriendUser) => void;
  autoOpenEmailPrefs?: boolean;
  autoOpenAvatarTab?: boolean;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<RoundHistoryRow[] | null>(null);
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [equippedCostume, setEquippedCostume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"rounds" | "avatar">(autoOpenAvatarTab ? "avatar" : "rounds");

  useEffect(() => {
    fetchMyRounds()
      .then(setRows)
      .catch(() => setError("Couldn't load your round history."));
    fetchFriendsOverview()
      .then((ov) => setFriends(ov.friends))
      .catch(() => setFriends([]));
    fetchAchievements()
      .then((a) => setEquippedCostume(a.equippedCostume))
      .catch(() => {});
  }, []);

  const wins = rows?.filter((r) => r.won).length ?? 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary-700 dark:text-primary-400">Profile</h1>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 shrink-0">
              <AvatarIcon
                avatar={(user?.profileAvatar as AvatarKey | null) ?? null}
                className="w-full h-full"
                costume={equippedCostume}
              />
            </div>
            <div>
              <div className="font-bold text-lg">{user?.name}</div>
              <div className="text-sm text-neutral-500">{user?.email}</div>
            </div>
          </div>
          {rows && (
            <div className="text-right">
              <div className="text-2xl font-extrabold text-primary-700 dark:text-primary-400">{wins}</div>
              <div className="text-xs text-neutral-500">
                {wins === 1 ? "win" : "wins"} of {rows.length} {rows.length === 1 ? "round" : "rounds"}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
          <div className="text-sm font-semibold text-neutral-500 mb-2">
            Friends{friends ? ` (${friends.length})` : ""}
          </div>
          {!friends && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          )}
          {friends && friends.length === 0 && (
            <p className="text-sm text-neutral-500">
              No friends added yet — search for them or quick-add from a game on the Friends page.
            </p>
          )}
          {friends && friends.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {friends.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onViewFriend(f)}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 pl-1.5 pr-3 py-1 text-sm font-medium hover:border-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
                  >
                    <span className="w-6 h-6 shrink-0">
                      <AvatarIcon
                        avatar={f.profileAvatar as AvatarKey | null}
                        className="w-full h-full"
                        costume={f.equippedCostume}
                      />
                    </span>
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          {(["rounds", "avatar"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
                tab === t
                  ? "bg-primary-600 text-white border-primary-600"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {t === "rounds" ? "Rounds" : "Avatar & Achievements"}
            </button>
          ))}
        </div>

        {tab === "rounds" ? (
          <>
            <EmailPreferences autoOpen={autoOpenEmailPrefs} />

            <div>
              <div className="text-sm font-semibold text-neutral-500 mb-2">Every round you've played</div>
              {error && <p className="text-sm text-danger-500">{error}</p>}
              {!rows && !error && <SkeletonRows count={4} withAvatar={false} />}
              {rows && <RoundHistoryTable rows={rows} emptyMessage="No rounds yet — go host or join one!" />}
            </div>
          </>
        ) : (
          <Closet />
        )}
      </div>
    </div>
  );
}
