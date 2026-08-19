import type { RoundHistoryRow } from "../types";

function formatDate(value: string): string {
  const d = new Date(value.includes("T") || value === "now" ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RoundHistoryTable({ rows, emptyMessage }: { rows: RoundHistoryRow[]; emptyMessage?: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage ?? "No rounds yet."}</p>;
  }

  // Old 9-hole rounds and new 18-hole rounds can both show up here, so size
  // the hole columns to whichever round in the list has the most.
  const maxHoles = Math.max(0, ...rows.map((r) => r.holeStrokes.length));

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
            {Array.from({ length: maxHoles }, (_, i) => (
              <th key={i} className="px-2 py-2.5 font-semibold text-right whitespace-nowrap">
                H{i + 1}
              </th>
            ))}
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Buckets</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">PG&amp;E</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Tiebreak</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
                r.won ? "bg-green-50 dark:bg-green-950/40" : ""
              }`}
            >
              <td className="px-3 py-2.5 whitespace-nowrap font-medium">{r.date === "now" ? "Today" : formatDate(r.date)}</td>
              {Array.from({ length: maxHoles }, (_, i) => (
                <td key={i} className="px-2 py-2.5 text-right text-neutral-600 dark:text-neutral-300">
                  {r.holeStrokes[i] ?? "–"}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right">{r.buckets}</td>
              <td className="px-3 py-2.5 text-right">{r.pge}</td>
              <td className="px-3 py-2.5 text-right">
                {r.tiebreak === "won" && <span className="text-green-600 font-semibold">Won</span>}
                {r.tiebreak === "lost" && <span className="text-red-500 font-semibold">Lost</span>}
                {r.tiebreak === null && <span className="text-neutral-400">—</span>}
              </td>
              <td className="px-3 py-2.5 text-right font-bold">
                {r.total}
                {r.won && <span className="ml-1 text-green-600">🏆</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
