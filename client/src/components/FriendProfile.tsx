import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { fetchStandings } from "../lib/api";
import { fetchFriendAchievements, fetchRoundsWithFriend, type FriendAchievements } from "../lib/friendsApi";
import { RoundHistoryTable } from "./RoundHistoryTable";
import { AvatarIcon, type AvatarKey } from "./Avatars";
import { Skeleton, SkeletonRows, SkeletonStatGrid } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import type { RoundHistoryRow, StandingsRow } from "../types";

/** A friend's public profile — their all-time standings (the leaderboard
 * already covers every name that's ever played, so this just finds their
 * row in it), their achievements (read-only — see the server route's own
 * doc comment for why it doesn't run the catch-and-award check), and every
 * round the two of you have actually played together, from your own
 * perspective (see myRounds.ts's buildRow). */
export function FriendProfile({
  friendUserId,
  friendName,
  friendAvatar,
  friendCostume,
  onBack,
}: {
  friendUserId: string;
  friendName: string;
  friendAvatar: string | null;
  friendCostume: string | null;
  onBack: () => void;
}) {
  const [standings, setStandings] = useState<StandingsRow | null | undefined>(undefined);
  const [achievements, setAchievements] = useState<FriendAchievements | null>(null);
  const [roundsTogether, setRoundsTogether] = useState<RoundHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStandings()
      .then((rows) => setStandings(rows.find((r) => r.name.toLowerCase() === friendName.toLowerCase()) ?? null))
      .catch(() => setStandings(null));
    fetchFriendAchievements(friendUserId)
      .then(setAchievements)
      .catch(() => setError("Couldn't load their achievements."));
    fetchRoundsWithFriend(friendUserId)
      .then(setRoundsTogether)
      .catch(() => setError("Couldn't load games you've played together."));
  }, [friendUserId, friendName]);

  const earnedCount = achievements?.achievements.filter((a) => a.earned).length ?? 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0">
              <AvatarIcon avatar={friendAvatar as AvatarKey | null} className="w-full h-full" costume={friendCostume} />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-700 dark:text-primary-400">{friendName}</h1>
          </div>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
          <div className="text-sm font-semibold text-neutral-500 mb-3">Standings</div>
          {standings === undefined && <SkeletonStatGrid />}
          {standings === null && <EmptyState message="No rounds recorded for them yet." />}
          {standings && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
              {(
                [
                  { label: "Rounds", value: standings.roundsPlayed },
                  { label: "Wins", value: standings.matchWins },
                  { label: "Holes won", value: standings.holesWon },
                  { label: "Buckets", value: standings.bucketsWon },
                  { label: "PG&E", value: standings.pgeWon },
                  { label: "Total pts", value: standings.totalPoints },
                ] as const
              ).map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-extrabold text-primary-700 dark:text-primary-400">{stat.value}</div>
                  <div className="text-[11px] text-neutral-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
          <div className="text-sm font-semibold text-neutral-500 mb-3">
            Achievements{achievements ? ` — ${earnedCount} of ${achievements.achievements.length}` : ""}
          </div>
          {!achievements && !error && <SkeletonRows count={4} withAvatar={false} />}
          {achievements && (
            <div className="space-y-2">
              {achievements.achievements.map((a) => (
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
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-neutral-500 mb-2">
            Games you've played together{roundsTogether ? ` (${roundsTogether.length})` : ""}
          </div>
          {!roundsTogether && !error && <Skeleton className="h-40 w-full rounded-xl" />}
          {roundsTogether && (
            <RoundHistoryTable
              rows={roundsTogether}
              emptyMessage="No rounds together yet — go host or join one with them!"
            />
          )}
        </div>
      </div>
    </div>
  );
}
