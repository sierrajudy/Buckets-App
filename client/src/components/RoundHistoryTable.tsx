import type { RoundHistoryRow } from "../types";

function formatDate(value: string): string {
  const d = new Date(value.includes("T") || value === "now" ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** holeStrokes is already this user's strokes in hole-play order (see
 * myRounds.ts), so front/back/total can just be summed straight off it —
 * no separate server data needed. An old 9-hole round has nothing to sum
 * for the back nine, so that half is left null (rendered as "–") rather
 * than a misleading 0. */
function strokeSummary(holeStrokes: (number | null)[]): { front: number; back: number | null; total: number } {
  const front = holeStrokes.slice(0, 9).reduce((sum: number, s) => sum + (s ?? 0), 0);
  const back = holeStrokes.length > 9 ? holeStrokes.slice(9, 18).reduce((sum: number, s) => sum + (s ?? 0), 0) : null;
  return { front, back, total: front + (back ?? 0) };
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
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Front 9</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Back 9</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Strokes</th>
            {Array.from({ length: maxHoles }, (_, i) => (
              <th key={i} className="px-2 py-2.5 font-semibold text-right whitespace-nowrap">
                H{i + 1}
              </th>
            ))}
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Buckets</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">PG&amp;E</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Tiebreak</th>
            <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const strokes = strokeSummary(r.holeStrokes);
            return (
            <tr
              key={r.id}
              className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
                r.won ? "bg-green-50 dark:bg-green-950/40" : ""
              }`}
            >
              <td className="px-3 py-2.5 whitespace-nowrap font-medium">{r.date === "now" ? "Today" : formatDate(r.date)}</td>
              <td className="px-3 py-2.5 text-right text-neutral-600 dark:text-neutral-300">{strokes.front}</td>
              <td className="px-3 py-2.5 text-right text-neutral-600 dark:text-neutral-300">{strokes.back ?? "–"}</td>
              <td className="px-3 py-2.5 text-right font-semibold">{strokes.total}</td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
