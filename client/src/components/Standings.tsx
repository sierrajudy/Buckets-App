import { useEffect, useState } from "react";
import { fetchMyRounds, fetchStandings } from "../lib/api";
import { useAuth } from "../authStore";
import { useRoom } from "../store";
import { RoundHistoryTable } from "./RoundHistoryTable";
import type { RoundHistoryRow, RoomState, StandingsRow } from "../types";

function buildCurrentGameRow(state: RoomState | null, myName: string | undefined): RoundHistoryRow | null {
  if (!state || !myName || state.phase === "lobby") return null;
  const holeStrokes = Array.from({ length: 9 }, (_, i) => {
    const result = state.results.find((r) => r.holeNumber === i + 1);
    const strokes = result?.strokes[myName];
    return strokes && strokes > 0 ? strokes : null;
  });
  const buckets = state.results.filter((r) => r.bucketWinners.includes(myName)).length;
  const pge = state.results.filter((r) => r.pgeEnabled && r.pgeWinners.includes(myName)).length;
  const tiebreak =
    state.phase === "celebration" && state.finishedRound?.puttOff.used
      ? state.finishedRound.puttOff.winner === myName
        ? "won"
        : "lost"
      : null;
  const won = state.phase === "celebration" && state.finishedRound?.winner === myName;

  return {
    id: "current",
    date: "now",
    holeStrokes,
    buckets,
    pge,
    tiebreak,
    total: state.totals[myName] ?? 0,
    won,
  };
}

export function Standings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
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

  const currentGame = buildCurrentGameRow(state, user?.name);
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

        {currentGame && (
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-2">Your current game</div>
            <RoundHistoryTable rows={[currentGame]} />
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-neutral-500 mb-2">Your last game</div>
          <RoundHistoryTable rows={lastGame ? [lastGame] : []} emptyMessage="No completed rounds yet." />
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
