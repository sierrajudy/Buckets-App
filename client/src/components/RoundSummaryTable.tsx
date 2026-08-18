import type { RoundPlayerSummary } from "../types";
import { PointsBar } from "./PointsBar";

function formatDate(value: string): string {
  if (value === "now") return "Today";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RoundSummaryTable({
  date,
  players,
  emptyMessage,
}: {
  date: string;
  players: RoundPlayerSummary[];
  emptyMessage?: string;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage ?? "No round to show yet."}</p>;
  }

  const sorted = [...players].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...players.map((p) => p.total), 1);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-sm text-neutral-500">Date: {formatDate(date)}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-4 py-2.5 font-semibold">Player</th>
              <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Total points</th>
              <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Holes won</th>
              <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Buckets won</th>
              <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">PG&amp;E</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr
                key={p.name}
                className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
                  p.won ? "bg-green-50 dark:bg-green-950/40" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-semibold">
                  {p.name}
                  {p.won && <span className="ml-1.5 text-green-600">🏆</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-14">
                      <PointsBar value={p.total} max={maxTotal} color={p.won ? "bg-amber-500" : "bg-green-500"} />
                    </span>
                    <span className="font-bold w-6 text-right">{p.total}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">{p.holesWon}</td>
                <td className="px-3 py-2.5 text-right">{p.buckets}</td>
                <td className="px-3 py-2.5 text-right">{p.pge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
