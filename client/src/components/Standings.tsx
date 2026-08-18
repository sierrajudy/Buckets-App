import { useEffect, useState } from "react";
import { fetchMyRounds, fetchStandings } from "../lib/api";
import { useRoom } from "../store";
import { RoundSummaryTable } from "./RoundSummaryTable";
import type { RoomState, RoundHistoryRow, RoundPlayerSummary, StandingsRow } from "../types";

function buildCurrentGamePlayers(state: RoomState | null): RoundPlayerSummary[] {
  if (!state || state.phase === "lobby") return [];
  const winner = state.phase === "celebration" ? state.finishedRound?.winner : undefined;

  return state.players.map((p) => ({
    name: p.name,
    total: state.totals[p.name] ?? 0,
    holesWon: state.results.filter((r) => r.holeWinners.includes(p.name)).length,
    buckets: state.results.filter((r) => r.bucketWinners.includes(p.name)).length,
    pge: state.results.filter((r) => r.pgeEnabled && r.pgeWinners.includes(p.name)).length,
    won: p.name === winner,
  }));
}

export function Standings({ onBack }: { onBack: () => void }) {
  const { state } = useRoom();
  const [rows, setRows] = useState<StandingsRow[] | null>(null);
  const [myRounds, setMyRounds] = useState<RoundHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStandings()
      .then(setRows)
      .catch(() => setError("Couldn't load standings."));
    fetchMyRounds()
      .then(setMyRounds)
      .catch(() => {
        // personal history is a nice-to-have on this screen — the leaderboard still works without it
      });
  }, []);

  const currentGamePlayers = buildCurrentGamePlayers(state);
  const lastGame = myRounds && myRounds.length > 0 ? myRounds[0] : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-green-700 dark:text-green-400">Standings</h1>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        {currentGamePlayers.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-2">Current Round</div>
            <RoundSummaryTable date="now" players={currentGamePlayers} />
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-neutral-500 mb-2">Last Round Played</div>
          <RoundSummaryTable
            date={lastGame?.date ?? ""}
            players={lastGame?.players ?? []}
            emptyMessage="No completed rounds yet."
          />
        </div>

        <div>
          <div className="text-sm font-semibold text-neutral-500 mb-2">All-time leaderboard</div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!rows && !error && <p className="text-sm text-neutral-500">Loading…</p>}

          {rows && rows.length === 0 && (
            <p className="text-sm text-neutral-500">No rounds recorded yet. Play a round to start building history.</p>
          )}

          {rows && rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-3 py-2.5 font-semibold">Player</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Rounds</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Wins</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Holes won</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Buckets</th>
                    <th className="px-3 py-2.5 font-semibold text-right">PG&amp;E</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Total pts</th>
                    <th className="px-3 py-2.5 font-semibold text-right">🍺 Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => b.matchWins - a.matchWins || b.totalPoints - a.totalPoints)
                    .map((r) => (
                      <tr key={r.name} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <td className="px-3 py-2.5 font-semibold">{r.name}</td>
                        <td className="px-3 py-2.5 text-right">{r.roundsPlayed}</td>
                        <td className="px-3 py-2.5 text-right text-green-700 dark:text-green-400 font-semibold">
                          {r.matchWins}
                        </td>
                        <td className="px-3 py-2.5 text-right">{r.holesWon}</td>
                        <td className="px-3 py-2.5 text-right">{r.bucketsWon}</td>
                        <td className="px-3 py-2.5 text-right">{r.pgeWon}</td>
                        <td className="px-3 py-2.5 text-right">{r.totalPoints}</td>
                        <td className="px-3 py-2.5 text-right">{r.beersOwed}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
