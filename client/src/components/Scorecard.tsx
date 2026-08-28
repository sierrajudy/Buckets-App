import { useEffect, useRef, useState } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";
import { GolfCart } from "./GolfCart";
import { CANNON_STAGGER_MS, DrivingRange } from "./DrivingRange";
import { HecklerGuy } from "./HecklerGuy";
import { RoomCodeBadge } from "./RoomCodeBadge";
import { EmojiReactionBar } from "./EmojiReactionBar";
import { PredictionPicker } from "./PredictionPicker";
import { WolfBackdrop } from "./WolfBackdrop";
import { WolfHoleTransition, pickWolfTransitionVariant, type WolfTransitionVariant } from "./WolfHoleTransition";
import { HighLowBackdrop } from "./HighLowBackdrop";
import { BucketsBackdrop } from "./BucketsBackdrop";
import { BaseballBackdrop } from "./BaseballBackdrop";
import type { AvatarKey, HoleResult } from "../types";

function sumTeamPoints(holes: HoleResult[]): [number, number] {
  return holes.reduce(
    (acc, h) => {
      const tp = h.highLow?.teamPoints ?? [0, 0];
      return [acc[0] + tp[0], acc[1] + tp[1]] as [number, number];
    },
    [0, 0] as [number, number],
  );
}

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
  costume,
}: {
  avatar: AvatarKey | null;
  className?: string;
  badge?: string;
  costume?: string | null;
}) {
  return (
    <span className="relative inline-block">
      <AvatarIcon avatar={avatar} className={className} costume={costume} />
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
    isSpectator,
    me,
    setStrokes,
    toggleBucket,
    setPgeEnabled,
    togglePgeWinner,
    setWolfChoice,
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
  const [wolfTransitionVariant, setWolfTransitionVariant] = useState<WolfTransitionVariant>("cart-course");
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
    setWolfTransitionVariant(pickWolfTransitionVariant());
    setShowBallRoll(true);
    // High Low's 4 golfers fire in a staggered "cannon" (see DrivingRange),
    // so the last player doesn't even start their own full-length flight
    // until 3 * CANNON_STAGGER_MS in — the overlay has to stay open that
    // much longer than CART_DURATION_MS or it closes mid-flight for them.
    const overlayMs = state?.gameMode === "highlow" ? CART_DURATION_MS + 3 * CANNON_STAGGER_MS : CART_DURATION_MS;
    const t = setTimeout(() => setShowBallRoll(false), overlayMs);
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
  const isHighLow = state.gameMode === "highlow";
  const isWolf = state.gameMode === "wolf";
  const isBuckets = state.gameMode === "standard";
  const isBaseball = state.gameMode === "baseball";
  const result = results[stepIndex];
  const isLastHole = stepIndex === results.length - 1;
  const holeComplete = players.every((p) => (result.strokes[p.name] ?? 0) > 0);
  // holeWinners has 2 names whenever a High Low team wins the hole outright
  // (not a tie, unlike standard mode where >1 winner only happens on a
  // split) — so the crown/tied-hole flourishes below are standard-mode only.
  const leader = isHighLow ? null : computeLeader(totals, players);
  const tiedHole = isHighLow ? false : isWolf ? result.wolf?.outcome === "tie" : result.holeWinners.length > 1;
  // Baseball has no birdie/eagle bonus at all — the badge still shows for
  // the flair, just without a point value that would otherwise be a lie.
  const birdieBonusLabel = isHighLow ? "+0.5 pt" : isWolf ? "×2 pts" : isBaseball ? "" : "+1 pt";
  const eagleBonusLabel = isHighLow ? "+1 pt" : isWolf ? "×3 pts" : isBaseball ? "" : "+2 pts";
  // Every mode gets its own bolder, high-contrast card look — a solid
  // color border instead of a plain neutral gray — so all three read as
  // visually distinct at a glance.
  const cardBorderCls = isHighLow
    ? "border-black"
    : isWolf
      ? "border-indigo-700 dark:border-indigo-400"
      : isBaseball
        ? "border-red-700 dark:border-red-400"
        : "border-emerald-700 dark:border-emerald-400";
  // Every mode now has its own fixed background scene, so cards go
  // translucent everywhere to let it show through — a dark glass tint (not
  // a light one) keeps white title text legible no matter what's behind
  // it, including High Low's sky swinging from bright blue to dark
  // mountain silhouette.
  const cardBgCls = "bg-black/30 backdrop-blur-sm";
  const themedTitleCls = "text-white";
  const themedSubCls = "text-white/70";
  const wolfName = result.wolf?.wolfName;

  function statusBadgeFor(name: string): string | undefined {
    if (isWolf && name === wolfName) return "🐺";
    if (name === leader) return "👑";
    return undefined;
  }

  /** Gross score, plus the net (after handicap strokes) when it differs —
   * so a stroke actually taken is visible right where the matchup is
   * decided, instead of the net swap looking unexplained. */
  function formatMatchupScore(name: string): string {
    const gross = result.strokes[name];
    if (!gross) return "–";
    const net = result.highLow?.netStrokes[name];
    if (net !== undefined && net !== gross) return `${gross} → ${net}`;
    return `${gross}`;
  }

  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden relative ${
        isHighLow
          ? "bg-gradient-to-b from-sky-400 via-amber-200 to-orange-400"
          : isWolf
            ? "bg-gradient-to-b from-slate-950 via-indigo-950 to-indigo-900"
            : isBaseball
              ? "bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900"
              : "bg-gradient-to-b from-slate-950 via-emerald-950 to-green-950"
      }`}
    >
      {isWolf && <WolfBackdrop />}
      {isHighLow && <HighLowBackdrop />}
      {isBuckets && <BucketsBackdrop />}
      {isBaseball && <BaseballBackdrop />}
      {showBallRoll &&
        (isWolf ? (
          <div className="fixed inset-0 z-40 overflow-hidden flex items-center justify-center">
            <WolfHoleTransition
              variant={wolfTransitionVariant}
              avatars={players.map((p) => p.avatar)}
              scoreHeckle={heckleMessage}
              durationMs={CART_DURATION_MS}
            />
          </div>
        ) : (
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

            {isHighLow ? (
              <div className="absolute inset-0">
                <DrivingRange avatars={players.map((p) => p.avatar)} durationMs={CART_DURATION_MS} />
              </div>
            ) : (
              <div
                className="absolute"
                style={{ bottom: "18%", animation: `cart-drive-across ${CART_DURATION_MS}ms ease-in-out` }}
              >
                <GolfCart avatars={players.map((p) => p.avatar)} size={180} />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-10 text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 text-green-700 dark:text-green-400 font-bold text-sm shadow">
                On to the next hole! ⛳
              </span>
            </div>
          </div>
        ))}

      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 sticky top-0 z-20">
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
          <RoomCodeBadge />
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

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4 relative z-10 pb-32 sm:pb-48">
        <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <FlagIcon className="w-6 h-8 shrink-0" />
            <div>
              <div className={`text-2xl font-extrabold ${themedTitleCls}`}>Hole {result.holeNumber}</div>
              <div className={`text-sm ${themedSubCls}`}>
                Par {result.par}
                {result.yardage > 0 && ` · ${result.yardage} yds`}
                {result.handicap > 0 && ` · Hcp ${result.handicap}`}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2 text-xs font-semibold">
              {result.isEagle && (
                <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Eagle{eagleBonusLabel && ` — ${eagleBonusLabel}`}
                </span>
              )}
              {result.isBirdie && (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Birdie{birdieBonusLabel && ` — ${birdieBonusLabel}`}
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

        {isHighLow && result.highLow && (
          <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4 space-y-3`}>
            <div className="text-sm font-extrabold text-white">High Low matchups</div>
            {(
              [
                { label: "Low", pair: result.highLow.lowPlayers, outcome: result.highLow.lowWinner },
                { label: "High", pair: result.highLow.highPlayers, outcome: result.highLow.highWinner },
              ] as const
            ).map(({ label, pair: [p0, p1], outcome }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/70 w-10 shrink-0">
                    {label}
                  </span>
                  <span
                    className={`flex-1 text-right truncate ${outcome === "team0" ? "font-bold text-green-300" : "text-white/70"}`}
                  >
                    {p0} ({formatMatchupScore(p0)})
                  </span>
                  <span className="text-white/60 px-2 text-xs shrink-0">vs</span>
                  <span
                    className={`flex-1 truncate ${outcome === "team1" ? "font-bold text-green-300" : "text-white/70"}`}
                  >
                    {p1} ({formatMatchupScore(p1)})
                  </span>
                </div>
                {outcome === "tie" && <div className="text-center text-xs text-white/60 mt-0.5">🙌 No blood</div>}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/20">
              {result.highLow.teamPoints.map((pts, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">
                    Team {i + 1}
                    {result.highLow!.bonusPoints[i] > 0 && (
                      <span className="text-xs font-normal text-white/70"> (+{result.highLow!.bonusPoints[i]} bonus)</span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-green-300">+{pts}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isWolf && result.wolf && (
          <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4 space-y-3`}>
            <div className="text-sm font-extrabold text-white">🐺 {result.wolf.wolfName} is the wolf this hole</div>

            {isHost && (
              <div className="flex flex-wrap gap-2">
                {players
                  .filter((p) => p.name !== result.wolf!.wolfName)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWolfChoice(result.holeNumber, p.name, false)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        result.wolf!.partner === p.name
                          ? "border-indigo-600 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          : "border-white/30 text-white/70"
                      }`}
                    >
                      Partner {p.name}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setWolfChoice(result.holeNumber, null, true)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    result.wolf.alone
                      ? "border-indigo-600 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                      : "border-white/30 text-white/70"
                  }`}
                >
                  Go alone
                </button>
              </div>
            )}

            {!isHost && (
              <div className="text-sm text-white/70">
                {result.wolf.alone
                  ? "Going alone against the other three."
                  : result.wolf.partner
                    ? `Partnered with ${result.wolf.partner}.`
                    : "Waiting on the wolf's call — partner up or go alone."}
              </div>
            )}

            {result.wolf.outcome && (
              <div className="pt-2 border-t border-white/20">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={`truncate ${result.wolf.outcome === "teamA" ? "font-bold text-green-300" : "text-white/70"}`}
                  >
                    {result.wolf.teamA.join(" & ")} ({result.wolf.bestA})
                  </span>
                  <span className="text-white/60 px-2 text-xs shrink-0">vs</span>
                  <span
                    className={`text-right truncate ${result.wolf.outcome === "teamB" ? "font-bold text-green-300" : "text-white/70"}`}
                  >
                    ({result.wolf.bestB}) {result.wolf.teamB.join(" & ")}
                  </span>
                </div>
                {result.wolf.outcome === "tie" && (
                  <div className="text-center text-xs text-white/60 mt-1">🙌 No blood</div>
                )}
              </div>
            )}
          </div>
        )}

        {isBaseball && result.baseball?.rankGroups && (
          <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4 space-y-2`}>
            <div className="text-sm font-extrabold text-white">⚾ Hole results</div>
            {result.baseball.rankGroups.map((group, i) => {
              const medal = ["🥇", "🥈", "🥉"][i] ?? "";
              const pts = result.baseball!.points[group[0]];
              return (
                <div key={i} className="flex items-center justify-between text-sm text-white">
                  <span className="truncate">
                    {medal} {group.join(" & ")}
                    {group.length > 1 && <span className="text-white/60"> (tied)</span>}
                  </span>
                  <span className="font-mono font-bold text-green-300 shrink-0">
                    {group.length > 1 ? `${pts} pts each` : `+${pts} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          {players.map((p) => {
            const strokes = result.strokes[p.name] ?? 0;
            const wonBucket = result.bucketWinners.includes(p.name);
            const wonPge = result.pgeWinners.includes(p.name);
            const tiedThisHole = tiedHole && result.holeWinners.includes(p.name);
            return (
              <div
                key={p.id}
                className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusAvatar
                      avatar={p.avatar}
                      className="w-8 h-8 shrink-0"
                      badge={statusBadgeFor(p.name)}
                      costume={p.equippedCostume}
                    />
                    <span className={`font-semibold ${themedTitleCls}`}>
                      {p.name}
                      {p.id === me?.id && <span className="font-normal text-white/60"> (you)</span>}
                    </span>
                    {tiedThisHole && (
                      <span className="text-base" style={{ animation: "high-five-pop 0.5s ease-out" }}>
                        🙌
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-green-300">
                    +{result.totalPoints[p.name] ?? 0} pts
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-sm w-16 ${themedSubCls}`}>Strokes</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => setStrokes(result.holeNumber, p.name, Math.max(1, (strokes || result.par) - 1))}
                      className="w-8 h-8 rounded-full border border-white/40 text-white text-lg leading-none disabled:opacity-30"
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
                      className="w-14 text-center rounded-lg border border-white/40 bg-transparent text-white placeholder:text-white/40 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => setStrokes(result.holeNumber, p.name, (strokes || result.par) + 1)}
                      className="w-8 h-8 rounded-full border border-white/40 text-white text-lg leading-none disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {isBuckets && (
                  <div className="flex flex-wrap gap-4">
                    <label
                      className={`flex items-center gap-2 text-sm text-white ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
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
                        className={`flex items-center gap-2 text-sm text-white ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
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
                )}
              </div>
            );
          })}
        </div>

        {isBuckets && (
          <label
            className={`flex items-center gap-2 text-sm text-white px-1 ${isHost ? "cursor-pointer" : "cursor-default opacity-70"}`}
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
        )}

        {isHighLow && state.teams ? (
          <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4`}>
            <div className="text-sm font-extrabold text-white mb-2">
              Match score{stepIndex >= 9 ? " · overall" : " · front 9"}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {state.teams.map((team, i) => (
                <div key={i}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/70">Team {i + 1}</div>
                  <div className="text-sm text-white/70 truncate">{team.join(" & ")}</div>
                  <div className="text-lg font-extrabold text-green-700 dark:text-green-400">{sumTeamPoints(results)[i]}</div>
                </div>
              ))}
            </div>
            {stepIndex >= 9 && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white/70">
                <span>Front 9</span>
                <span className="font-mono">
                  {sumTeamPoints(results.slice(0, 9)).join(" – ")}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={`${cardBgCls} rounded-xl border ${cardBorderCls} p-4`}>
            <div className={`text-sm font-bold ${themedSubCls} mb-2`}>Running score</div>
            <div className="flex flex-wrap gap-4">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <StatusAvatar
                    avatar={p.avatar}
                    className="w-6 h-6 shrink-0"
                    badge={statusBadgeFor(p.name)}
                    costume={p.equippedCostume}
                  />
                  <span className="text-sm text-white">{p.name}</span>
                  <span className="text-lg font-extrabold text-green-300">
                    {totals[p.name] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSpectator ? (
          <div className="space-y-3">
            <PredictionPicker />
            <EmojiReactionBar />
          </div>
        ) : (
          state.spectators.length > 0 && <PredictionPicker readOnly />
        )}

        <div className="flex gap-2 pb-6">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className={`flex-1 rounded-lg border ${cardBorderCls} text-white py-2.5 font-semibold text-sm disabled:opacity-40`}
          >
            Back
          </button>
          {isHost && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className={`shrink-0 rounded-lg border ${isHighLow ? "border-red-600" : "border-red-300 dark:border-red-900"} text-red-600 dark:text-red-400 px-3 py-2.5 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/40`}
            >
              End Game
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Reload if the game stops updating (e.g. after switching apps)"
            className={`shrink-0 rounded-lg border ${cardBorderCls} text-white px-3 py-2.5 font-semibold text-sm hover:bg-white/10`}
          >
            Refresh
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
                  className={`flex-1 rounded-lg border bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 font-semibold text-sm ${isHighLow ? "border-green-800" : "border-transparent"}`}
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
              className={`flex-1 rounded-lg border bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-2.5 font-semibold text-sm ${isHighLow ? "border-green-800" : "border-transparent"}`}
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
