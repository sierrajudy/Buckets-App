import { forwardRef } from "react";
import { AvatarIcon } from "./Avatars";
import type { Player, RoundSummary } from "../types";

interface BiggestHole {
  holeNumber: number;
  player: string;
  points: number;
}

/** The hole where any single player scored the most points, across every
 * mode — HoleResult.totalPoints is keyed by player name in all of them, so
 * this needs no per-mode branching. Ignores 0-point holes (nothing to brag
 * about there) and returns null for a round with no scoring at all. */
function findBiggestHole(round: RoundSummary): BiggestHole | null {
  let best: BiggestHole | null = null;
  for (const h of round.holes) {
    for (const [player, points] of Object.entries(h.totalPoints)) {
      if (points > 0 && (!best || points > best.points)) {
        best = { holeNumber: h.holeNumber, player, points };
      }
    }
  }
  return best;
}

/** A fixed-size (540px wide), portrait, screenshot-friendly summary of a
 * finished round — rendered off-screen at its natural size and captured to
 * a PNG by ShareRecapModal via html-to-image. Kept deliberately simple and
 * high-contrast: it has to still read well as a compressed image in a group
 * chat, not just on a full-size screen. */
export const RecapCard = forwardRef<HTMLDivElement, { round: RoundSummary; players: Player[] }>(
  function RecapCard({ round, players }, ref) {
    const avatarFor = (name: string) => players.find((p) => p.name === name)?.avatar ?? null;
    const costumeFor = (name: string) => players.find((p) => p.name === name)?.equippedCostume ?? null;
    const biggestHole = findBiggestHole(round);
    const isHighLow = round.gameMode === "highlow" && round.teams && round.highLow;

    return (
      <div
        ref={ref}
        className="w-[540px] bg-gradient-to-b from-emerald-800 via-emerald-900 to-slate-950 text-white p-8 flex flex-col gap-6"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        <div className="text-center">
          <div className="text-2xl font-black tracking-tight">🪣 Buckets</div>
          <div className="text-xs text-emerald-300 uppercase tracking-widest mt-0.5">for degenerate golfers</div>
        </div>

        <div className="text-center border-y border-white/15 py-4">
          <div className="text-sm text-emerald-300 uppercase tracking-widest">{round.course}</div>
          {isHighLow && round.teams && round.highLow ? (
            <>
              <div className="mt-2 text-3xl font-black text-yellow-300">
                {round.highLow.overall.winner !== null ? `${round.teams[round.highLow.overall.winner].join(" & ")} win!` : "It's a tie!"}
              </div>
              <div className="text-sm text-emerald-200 mt-1">
                {round.highLow.overall.points[0]} – {round.highLow.overall.points[1]}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mt-2">
                <div className="w-16 h-16">
                  <AvatarIcon avatar={avatarFor(round.winner)} className="w-full h-full" costume={costumeFor(round.winner)} />
                </div>
              </div>
              <div className="text-3xl font-black text-yellow-300 mt-1">{round.winner} wins!</div>
              <div className="text-sm text-emerald-200 mt-1">{round.totals[round.winner]} points</div>
            </>
          )}
        </div>

        {(biggestHole || round.holeInOnePlayer || round.puttOff.used) && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Big moments</div>
            {round.holeInOnePlayer && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm">
                ⛳ <span className="font-bold">{round.holeInOnePlayer}</span> aced a hole in one
              </div>
            )}
            {biggestHole && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm">
                🔥 <span className="font-bold">{biggestHole.player}</span> put up {biggestHole.points} pts on hole{" "}
                {biggestHole.holeNumber}
              </div>
            )}
            {round.puttOff.used && (
              <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm">
                🎯 Won in a putt-off{round.puttOff.winner ? ` by ${round.puttOff.winner}` : ""}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Final scores</div>
          {[...round.players]
            .sort((a, b) => (round.totals[b] ?? 0) - (round.totals[a] ?? 0))
            .map((p) => (
              <div key={p} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-7 h-7 shrink-0">
                    <AvatarIcon avatar={avatarFor(p)} className="w-full h-full" costume={costumeFor(p)} />
                  </span>
                  <span className={round.winners.includes(p) ? "font-bold text-yellow-300" : ""}>{p}</span>
                </span>
                <span className="font-mono text-sm">{round.totals[p]}</span>
              </div>
            ))}
        </div>

        {round.losers.length > 0 && (
          <div className="text-center text-sm text-amber-300">
            🍺 {round.losers.join(" & ")} {round.losers.length > 1 ? "are" : "is"} buying
          </div>
        )}
      </div>
    );
  },
);
