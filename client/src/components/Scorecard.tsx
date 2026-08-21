import { useEffect, useRef, useState } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";
import { GolfCart } from "./GolfCart";
import { HecklerGuy } from "./HecklerGuy";
import type { AvatarKey, HoleResult } from "../types";

function computeLeader(totals: Record<string, number>, players: { name: string }[]): string | null {
  if (players.length < 2) return null;
  const vals = players.map((p) => totals[p.name] ?? 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max === min) return null;
  const leaders = players.filter((p) => (totals[p.name] ?? 0) === max);
  return leaders.length === 1 ? leaders[0].name : null;
}

/** Sideline commentary for the hole just finished: two or more players
 * double-bogeying (2+ over par) gets "Join me!"; exactly one gets called
 * out by name. Anything better than that stays quiet. */
function computeHeckle(prevResult: HoleResult | undefined, players: { name: string }[]): string | null {
  if (!prevResult) return null;
  const doubleBogeyPlus = players.filter((p) => (prevResult.strokes[p.name] ?? 0) - prevResult.par >= 2);

  if (doubleBogeyPlus.length >= 2) return "Join me!";
  if (doubleBogeyPlus.length === 1) return `${doubleBogeyPlus[0].name} Cut! Cut! Cut!`;
  return null;
}

function StatusAvatar({
  avatar,
  className,
  badge,
}: {
  avatar: AvatarKey | null;
  className?: string;
  badge?: string;
}) {
  return (
    <span className="relative inline-block">
      <AvatarIcon avatar={avatar} className={className} />
      {badge && (
        <span
          className="absolute -top-1.5 -right-1.5 text-sm leading-none select-none"
          style={{ animation: "badge-pop 0.4s ease-out" }}
        >
          {badge}
        </span>
      )}
    </span>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ transformOrigin: "4px 22px" }}>
      <line x1="4" y1="2" x2="4" y2="22" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M4 3 L19 7 L4 11 Z"
        fill="#ef4444"
        stroke="#0f172a"
        strokeWidth="1"
        style={{ animation: "flag-flutter 1.8s ease-in-out infinite" }}
      />
    </svg>
  );
}

export function Scorecard() {
  const {
    state,
    isHost,
    me,
    setStrokes,
    toggleBucket,
    setPgeEnabled,
    togglePgeWinner,
    leaveRoom,
    confirmFinishRound,
    endGame,
    setCurrentStep,
  } = useRoom();
  const hostCurrentStep = state?.currentStep ?? 0;
  const results = state?.results ?? [];
  const players = state?.players ?? [];
  const [stepIndex, setStepIndex] = useState(() => hostCurrentStep);
  const [showBallRoll, setShowBallRoll] = useState(false);
  const [heckleMessage, setHeckleMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const prevStepIndex = useRef(stepIndex);
  const resultsRef = useRef(results);
  const playersRef = useRef(players);
  resultsRef.current = results;
  playersRef.current = players;
  const CART_DURATION_MS = 3200;

  // Only animate the cart on a forward move — the host advancing, a guest
  // stepping forward on their own, or jumping back to the host's hole.
  // Going back never plays it. Depends on stepIndex ONLY: results/players
  // change on every unrelated state broadcast (a stroke edit elsewhere,
  // etc.), and including them here would re-run this effect mid-animation,
  // canceling the pending setShowBallRoll(false) via the cleanup below
  // without rescheduling it — leaving the cart stuck on screen forever.
  useEffect(() => {
    const prev = prevStepIndex.current;
    prevStepIndex.current = stepIndex;
    if (stepIndex <= prev) return;
    setHeckleMessage(computeHeckle(resultsRef.current[stepIndex - 1], playersRef.current));
    setShowBallRoll(true);
    const t = setTimeout(() => setShowBallRoll(false), CART_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Guests automatically follow the host forward; they can still browse
  // back on their own via the Back button until the host moves again.
  useEffect(() => {
    if (isHost) return;
    setStepIndex(hostCurrentStep);
  }, [hostCurrentStep, isHost]);

  if (!state) return null;
  const { totals } = state;
  const result = results[stepIndex];
  const isLastHole = stepIndex === results.length - 1;
  const holeComplete = players.every((p) => (result.strokes[p.name] ?? 0) > 0);
  const leader = computeLeader(totals, players);
  const tiedHole = result.holeWinners.length > 1;

  function statusBadgeFor(name: string): string | undefined {
    if (name === leader) return "👑";
    return undefined;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col overflow-hidden relative">
      {showBallRoll && (
        <div
          className="fixed inset-0 z-40 overflow-hidden flex items-center justify-center"
          style={{
            background: "linear-gradient(to bottom, #bae6fd 0%, #bae6fd 55%, #4ade80 55%, #16a34a 100%)",
          }}
        >
          <div className="absolute top-8 left-10 w-16 h-8 rounded-full bg-white/80" />
          <div className="absolute top-16 left-28 w-20 h-9 rounded-full bg-white/70" />
          <div className="absolute top-10 right-14 w-14 h-7 rounded-full bg-white/70" />

          {heckleMessage && <HecklerGuy message={heckleMessage} />}

          <div
            className="absolute"
            style={{ bottom: "18%", animation: `cart-drive-across ${CART_DURATION_MS}ms ease-in-out` }}
          >
            <GolfCart avatars={players.map((p) => p.avatar)} size={180} />
          </div>

          <div className="absolute inset-x-0 bottom-10 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 text-green-700 dark:text-green-400 font-bold text-sm shadow">
              On to the next hole! ⛳
            </span>
          </div>
        </div>
      )}

      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={leaveRoom} className="text-sm text-neutral-500 hover:text-red-500">
            Leave
          </button>
          <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            Hole {stepIndex + 1} of {results.length}{" "}
            {!isHost &&
              (stepIndex === state.currentStep ? (
                <span className="text-neutral-400 font-normal">· watching live</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setStepIndex(state.currentStep)}
                  className="text-green-600 dark:text-green-400 font-semibold underline underline-offset-2"
                >
                  · Jump to current hole
                </button>
              ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-3 relative h-6">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-700 dark:from-green-700 dark:to-green-900 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 6px, transparent 6px, transparent 12px)",
              }}
            />
          </div>
          {results.map((r, i) => {
            const done = players.every((p) => (r.strokes[p.name] ?? 0) > 0);
            const pct = (i / (results.length - 1)) * 100;
            return (
              <button
                key={r.holeNumber}
                onClick={() => setStepIndex(i)}
                title={`Hole ${r.holeNumber}`}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  done
                    ? "bg-white border-white"
                    : "bg-green-800/40 border-green-200 dark:border-green-900"
                }`}
                style={{ left: `${pct}%` }}
              />
            );
          })}
          <div
            className="absolute top-1/2 w-5 h-5 transition-all duration-500 ease-out drop-shadow-md"
            style={{
              left: `${(stepIndex / (results.length - 1)) * 100}%`,
              transform: "translate(-50%, -60%)",
            }}
          >
            <svg viewBox="0 0 20 20" width="100%" height="100%" role="img" aria-label="Golf ball marker">
              <circle cx="10" cy="10" r="9" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              {[
                [7, 6],
                [10, 5.5],
                [13, 6],
                [5.5, 10],
                [14.5, 10],
                [7, 14],
                [13, 14],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="0.85" fill="#cbd5e1" />
              ))}
            </svg>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlagIcon className="w-6 h-8 shrink-0" />
            <div>
              <div className="text-2xl font-extrabold">Hole {result.holeNumber}</div>
              <div className="text-sm text-neutral-500">Par {result.par}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
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
            {tiedHole && (
              <span
                className="px-2 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 text-xs font-semibold"
                style={{ animation: "high-five-pop 0.5s ease-out" }}
              >
                🙌 Tied hole!
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {players.map((p) => {
            const strokes = result.strokes[p.name] ?? 0;
            const wonBucket = result.bucketWinners.includes(p.name);
            const wonPge = result.pgeWinners.includes(p.name);
            const tiedThisHole = tiedHole && result.holeWinners.includes(p.name);
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusAvatar avatar={p.avatar} className="w-8 h-8 shrink-0" badge={statusBadgeFor(p.name)} />
                    <span className="font-semibold">
                      {p.name}
                      {p.id === me?.id && <span className="text-neutral-400 font-normal"> (you)</span>}
                    </span>
                    {tiedThisHole && (
                      <span className="text-base" style={{ animation: "high-five-pop 0.5s ease-out" }}>
                        🙌
                      </span>
                    )}
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
                      checked={wonBucket}
                      onChange={() => toggleBucket(result.holeNumber, p.name)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span
                      className="inline-block"
                      style={wonBucket ? { animation: "bucket-ripple 1s ease-in-out infinite" } : undefined}
                    >
                      🪣
                    </span>
                    Won bucket
                  </label>
                  {result.pgeEnabled && (
                    <label
                      className={`flex items-center gap-2 text-sm ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isHost}
                        checked={wonPge}
                        onChange={() => togglePgeWinner(result.holeNumber, p.name)}
                        className="w-4 h-4 accent-yellow-500"
                      />
                      <span
                        className="inline-block"
                        style={wonPge ? { animation: "pge-flicker 1.4s ease-in-out infinite" } : undefined}
                      >
                        ⚡
                      </span>
                      Won PG&E
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
                <StatusAvatar avatar={p.avatar} className="w-6 h-6 shrink-0" badge={statusBadgeFor(p.name)} />
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{p.name}</span>
                <span className="text-lg font-extrabold text-green-700 dark:text-green-400">{totals[p.name] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pb-6">
          {isHost && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="shrink-0 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-2.5 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              End Game
            </button>
          )}
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-2.5 font-semibold text-sm disabled:opacity-40"
          >
            Back
          </button>
          {isLastHole ? (
            holeComplete ? (
              isHost ? (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => {
                    setConfirming(true);
                    confirmFinishRound();
                  }}
                  className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 font-semibold text-sm"
                >
                  {confirming ? "Finishing…" : "Confirm & Finish Round"}
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
                  Waiting for host to confirm the round…
                </div>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
                Enter every score to finish
              </div>
            )
          ) : (
            <button
              type="button"
              disabled={!holeComplete}
              onClick={() => {
                const next = Math.min(results.length - 1, stepIndex + 1);
                setStepIndex(next);
                if (isHost) setCurrentStep(next);
              }}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-2.5 font-semibold text-sm"
            >
              Next hole
            </button>
          )}
        </div>
      </div>

      {showEndConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-lg text-neutral-900 dark:text-white">
              Are you sure you want to end the game?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={ending}
                onClick={() => {
                  setEnding(true);
                  endGame();
                }}
                className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5"
              >
                {ending ? "Ending…" : "Yes"}
              </button>
              <button
                type="button"
                disabled={ending}
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
