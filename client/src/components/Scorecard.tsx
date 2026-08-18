import { useState } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";

export function Scorecard() {
  const { state, isHost, me, setStrokes, toggleBucket, setPgeEnabled, togglePgeWinner, leaveRoom } = useRoom();
  const [stepIndex, setStepIndex] = useState(0);

  if (!state) return null;
  const { results, players, totals } = state;
  const result = results[stepIndex];
  const isLastHole = stepIndex === results.length - 1;
  const holeComplete = players.every((p) => (result.strokes[p.name] ?? 0) > 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={leaveRoom} className="text-sm text-neutral-500 hover:text-red-500">
            Leave
          </button>
          <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            Hole {stepIndex + 1} of 9 {!isHost && <span className="text-neutral-400 font-normal">· watching live</span>}
          </div>
        </div>
        <div className="flex gap-1 max-w-2xl mx-auto mt-2 overflow-x-auto">
          {results.map((r, i) => {
            const done = players.every((p) => (r.strokes[p.name] ?? 0) > 0);
            return (
              <button
                key={r.holeNumber}
                onClick={() => setStepIndex(i)}
                className={`shrink-0 w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center border ${
                  i === stepIndex
                    ? "bg-green-600 text-white border-green-600"
                    : done
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-500"
                }`}
              >
                {r.holeNumber}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold">Hole {result.holeNumber}</div>
            <div className="text-sm text-neutral-500">Par {result.par}</div>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            {result.isEagle && (
              <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                Eagle — 3x points
              </span>
            )}
            {result.isBirdie && !result.isEagle && (
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Birdie — 2x points
              </span>
            )}
            {result.holeInOnePlayers.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 animate-pulse">
                HOLE IN ONE!
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {players.map((p) => {
            const strokes = result.strokes[p.name] ?? 0;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AvatarIcon avatar={p.avatar} className="w-8 h-8 shrink-0" />
                    <span className="font-semibold">
                      {p.name}
                      {p.id === me?.id && <span className="text-neutral-400 font-normal"> (you)</span>}
                    </span>
                  </div>
                  <span className="text-sm text-green-700 dark:text-green-400 font-semibold">
                    +{result.totalPoints[p.name] ?? 0} pts
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-neutral-500 w-16">Strokes</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => setStrokes(result.holeNumber, p.name, Math.max(1, (strokes || result.par) - 1))}
                      className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 text-lg leading-none disabled:opacity-30"
                    >
                      –
                    </button>
                    <input
                      type="number"
                      min={1}
                      disabled={!isHost}
                      value={strokes || ""}
                      onChange={(e) => setStrokes(result.holeNumber, p.name, Number(e.target.value) || null)}
                      placeholder={String(result.par)}
                      className="w-14 text-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => setStrokes(result.holeNumber, p.name, (strokes || result.par) + 1)}
                      className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 text-lg leading-none disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label
                    className={`flex items-center gap-2 text-sm ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isHost}
                      checked={result.bucketWinners.includes(p.name)}
                      onChange={() => toggleBucket(result.holeNumber, p.name)}
                      className="w-4 h-4 accent-green-600"
                    />
                    🪣 Won bucket
                  </label>
                  {result.pgeEnabled && (
                    <label
                      className={`flex items-center gap-2 text-sm ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isHost}
                        checked={result.pgeWinners.includes(p.name)}
                        onChange={() => togglePgeWinner(result.holeNumber, p.name)}
                        className="w-4 h-4 accent-yellow-500"
                      />
                      ⚡ Won PG&E
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <label
          className={`flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 px-1 ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
        >
          <input
            type="checkbox"
            disabled={!isHost}
            checked={result.pgeEnabled}
            onChange={(e) => setPgeEnabled(result.holeNumber, e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          ⚡ PG&E special challenge on this hole (optional)
        </label>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm font-semibold text-neutral-500 mb-2">Running score</div>
          <div className="flex flex-wrap gap-4">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <AvatarIcon avatar={p.avatar} className="w-6 h-6 shrink-0" />
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{p.name}</span>
                <span className="text-lg font-extrabold text-green-700 dark:text-green-400">{totals[p.name] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pb-6">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-2.5 font-semibold text-sm disabled:opacity-40"
          >
            Back
          </button>
          {isLastHole ? (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
              {holeComplete ? "Round finishing…" : "Round finishes once every score is in"}
            </div>
          ) : (
            <button
              type="button"
              disabled={!holeComplete}
              onClick={() => setStepIndex((i) => Math.min(results.length - 1, i + 1))}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-2.5 font-semibold text-sm"
            >
              Next hole
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
