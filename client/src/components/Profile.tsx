import { useEffect, useState } from "react";
import { useAuth } from "../authStore";
import { fetchMyRounds } from "../lib/api";
import { RoundHistoryTable } from "./RoundHistoryTable";
import { EmailPreferences } from "./EmailPreferences";
import { Closet } from "./Closet";
import type { RoundHistoryRow } from "../types";

export function Profile({
  onBack,
  autoOpenEmailPrefs = false,
  autoOpenAvatarTab = false,
}: {
  onBack: () => void;
  autoOpenEmailPrefs?: boolean;
  autoOpenAvatarTab?: boolean;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<RoundHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"rounds" | "avatar">(autoOpenAvatarTab ? "avatar" : "rounds");

  useEffect(() => {
    fetchMyRounds()
      .then(setRows)
      .catch(() => setError("Couldn't load your round history."));
  }, []);

  const wins = rows?.filter((r) => r.won).length ?? 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-green-700 dark:text-green-400">Profile</h1>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">{user?.name}</div>
            <div className="text-sm text-neutral-500">{user?.email}</div>
          </div>
          {rows && (
            <div className="text-right">
              <div className="text-2xl font-extrabold text-green-700 dark:text-green-400">{wins}</div>
              <div className="text-xs text-neutral-500">
                {wins === 1 ? "win" : "wins"} of {rows.length} {rows.length === 1 ? "round" : "rounds"}
              </div>
            </div>
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
                  ? "bg-green-600 text-white border-green-600"
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              {!rows && !error && <p className="text-sm text-neutral-500">Loading…</p>}
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
