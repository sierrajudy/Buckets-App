import type { HoleResult } from "../types";

function markersFor(hole: HoleResult, name: string): string {
  const marks: string[] = [];
  if (hole.holeInOnePlayers.includes(name)) marks.push("🎯");
  else if (hole.isEagle && (hole.par - (hole.strokes[name] ?? 0)) >= 2) marks.push("🦅");
  else if (hole.isBirdie && hole.par - (hole.strokes[name] ?? 0) === 1) marks.push("🐦");
  if (hole.bucketWinners.includes(name)) marks.push("🪣");
  if (hole.pgeEnabled && hole.pgeWinners.includes(name)) marks.push("⚡");
  return marks.join(" ");
}

function sumStrokes(holes: HoleResult[], name: string): number {
  return holes.reduce((sum, h) => sum + (h.strokes[name] ?? 0), 0);
}

function HoleRow({ hole, players }: { hole: HoleResult; players: string[] }) {
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{hole.holeNumber}</td>
      <td className="px-3 py-2.5 text-right text-neutral-500">{hole.par}</td>
      {players.map((name) => {
        const strokes = hole.strokes[name] ?? 0;
        const pts = hole.totalPoints[name] ?? 0;
        const won = hole.holeWinners.includes(name);
        const marks = markersFor(hole, name);
        return (
          <td key={name} className={`px-3 py-2 text-center ${won ? "bg-primary-50 dark:bg-primary-950/40" : ""}`}>
            <div className="flex flex-col items-center leading-tight">
              <span className="font-bold">{strokes || "–"}</span>
              {strokes > 0 && (
                <span className="text-[10px] text-primary-600 dark:text-primary-400">
                  {pts > 0 ? `+${pts}` : "0"}
                </span>
              )}
              {marks && <span className="text-xs">{marks}</span>}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

/** A full-width divider labeling where the front/back 9 actually starts —
 * sits above hole 1 and hole 10, not just implied by a subtotal after the
 * fact at hole 9/18. */
function SectionHeaderRow({ label, columns }: { label: string; columns: number }) {
  return (
    <tr className="bg-neutral-100 dark:bg-neutral-800">
      <td
        colSpan={columns}
        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
      >
        {label}
      </td>
    </tr>
  );
}

/** A bold, shaded subtotal row — OUT/IN/Total, same idea as a paper
 * scorecard's own subtotal boxes. */
function SubtotalRow({
  label,
  holes,
  players,
  emphasize = false,
}: {
  label: string;
  holes: HoleResult[];
  players: string[];
  emphasize?: boolean;
}) {
  return (
    <tr
      className={`border-b-2 font-bold ${
        emphasize
          ? "border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-950/40"
          : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60"
      }`}
    >
      <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>
        {label}
      </td>
      {players.map((name) => (
        <td key={name} className="px-3 py-2 text-center">
          {sumStrokes(holes, name)}
        </td>
      ))}
    </tr>
  );
}

export function HoleBreakdownModal({
  course,
  players,
  holes,
  onClose,
}: {
  course?: string | null;
  players: string[];
  holes: HoleResult[];
  onClose: () => void;
}) {
  const frontHoles = holes.filter((h) => h.holeNumber <= 9);
  const backHoles = holes.filter((h) => h.holeNumber > 9);
  const hasBackNine = backHoles.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-primary-100 dark:border-primary-900 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-primary-700 dark:text-primary-400">Hole-by-hole</h2>
            {course && <p className="text-xs text-neutral-500">{course}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Hole</th>
                <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Par</th>
                {players.map((name) => (
                  <th key={name} className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasBackNine && <SectionHeaderRow label="Front 9" columns={2 + players.length} />}
              {frontHoles.map((hole) => (
                <HoleRow key={hole.holeNumber} hole={hole} players={players} />
              ))}
              {hasBackNine && <SubtotalRow label="OUT" holes={frontHoles} players={players} />}
              {hasBackNine && <SectionHeaderRow label="Back 9" columns={2 + players.length} />}
              {backHoles.map((hole) => (
                <HoleRow key={hole.holeNumber} hole={hole} players={players} />
              ))}
              {hasBackNine && <SubtotalRow label="IN" holes={backHoles} players={players} />}
              <SubtotalRow label="Total" holes={holes} players={players} emphasize />
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 shrink-0">
          🦅 eagle · 🐦 birdie · 🎯 hole in one · 🪣 bucket · ⚡ PG&amp;E · shaded cell = won the hole
        </div>
      </div>
    </div>
  );
}
