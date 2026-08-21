import { useMemo } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";
import { RoomCodeBadge } from "./RoomCodeBadge";
import { EmojiReactionBar } from "./EmojiReactionBar";
import { joinNames } from "../lib/format";

const CONFETTI_COLORS = ["#facc15", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
  size: number;
}

function useConfetti(count = 140): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 200,
        color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [count],
  );
}

export function Celebration({ onViewStandings }: { onViewStandings: () => void }) {
  const { state, isHost, isSpectator, newRound } = useRoom();
  const confetti = useConfetti();

  if (!state || !state.finishedRound) return null;
  const round = state.finishedRound;

  function avatarFor(name: string) {
    return state!.players.find((p) => p.name === name)?.avatar ?? null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map((c) => (
          <div
            key={c.id}
            style={{
              left: `${c.left}%`,
              top: "-5vh",
              width: c.size,
              height: c.size * 0.4,
              backgroundColor: c.color,
              animation: `confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
              // @ts-expect-error custom property for the keyframe
              "--drift": `${c.drift}px`,
            }}
            className="absolute rounded-sm"
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <RoomCodeBadge variant="dark" />
        </div>

        {round.holeInOnePlayer && (
          <div className="text-amber-400 font-bold text-sm tracking-widest uppercase">
            Match won on a hole in one!
          </div>
        )}
        {round.puttOff.used && (
          <div className="text-blue-400 font-bold text-sm tracking-widest uppercase">Won in a putt-off</div>
        )}

        <div>
          <div className="text-neutral-400 text-sm tracking-[0.3em] uppercase mb-2">Champion</div>
          <div className="flex items-center justify-center mb-2">
            <AvatarIcon avatar={avatarFor(round.winner)} className="w-20 h-20" />
          </div>
          <div
            className="text-5xl sm:text-6xl font-black text-yellow-300"
            style={{ animation: "lights-glow 1.4s ease-in-out infinite, pop-in 0.6s ease-out" }}
          >
            {round.winner}
          </div>
          <div className="mt-2 text-2xl font-bold text-green-400">{round.totals[round.winner]} pts</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="text-sm text-neutral-400 mb-3">Final scores</div>
          <div className="space-y-1.5">
            {[...round.players]
              .sort((a, b) => (round.totals[b] ?? 0) - (round.totals[a] ?? 0))
              .map((p) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AvatarIcon avatar={avatarFor(p)} className="w-6 h-6" />
                    <span className={p === round.winner ? "text-yellow-300 font-semibold" : "text-neutral-300"}>
                      {p}
                    </span>
                  </span>
                  <span className="font-mono text-neutral-300">{round.totals[p]}</span>
                </div>
              ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-5 bg-amber-950/40 border border-amber-800"
          style={{ animation: "pop-in 0.6s ease-out 0.3s both" }}
        >
          <div className="text-2xl mb-1">🍺</div>
          <div className="text-amber-200 font-semibold">
            {joinNames(round.losers)} {round.losers.length > 1 ? "are" : "is"} buying the beers
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <p className="text-sm text-neutral-300">
            Enjoying Buckets? Venmo{" "}
            <a
              href="https://venmo.com/u/Sierra-Judy-2"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 hover:text-green-400"
            >
              @Sierra-judy-2
            </a>
          </p>
          <a
            href="https://forms.gle/Ak7XVKw863xM1B8L8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 px-4 py-2 text-sm font-semibold"
          >
            Send Feedback
          </a>
        </div>

        {isSpectator && <EmojiReactionBar dark />}

        <div className="flex gap-2">
          <button
            onClick={onViewStandings}
            className="flex-1 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 py-2.5 font-semibold text-sm"
          >
            View standings
          </button>
          {isHost ? (
            <button
              onClick={newRound}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 font-semibold text-sm"
            >
              New round
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
              Waiting for host to start a new round…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
