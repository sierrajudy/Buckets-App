import { useState } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";
import { RoomCodeBadge } from "./RoomCodeBadge";
import { EmojiReactionBar } from "./EmojiReactionBar";
import { PredictionPicker } from "./PredictionPicker";
import { joinNames } from "../lib/format";

export function PuttOff() {
  const { state, isHost, isSpectator, resolvePuttOff } = useRoom();
  const [winner, setWinner] = useState<string | null>(null);

  if (!state) return null;
  const tiedPlayers = state.tiedLeaders;

  function playerFor(name: string) {
    return state!.players.find((p) => p.name === name) ?? null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-3">
      <div className="flex justify-center">
        <RoomCodeBadge variant="dark" />
      </div>
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5 text-center">
        <div className="text-4xl">⛳</div>
        <h2 className="text-2xl font-extrabold text-white">It's a tie!</h2>
        <p className="text-neutral-400 text-sm">
          {joinNames(tiedPlayers)} are tied for the lead. Time for a putt-off — closest to the hole wins the
          match.
        </p>

        {isHost ? (
          <>
            <div className="space-y-2">
              {tiedPlayers.map((name) => (
                <button
                  key={name}
                  onClick={() => setWinner(name)}
                  className={`w-full rounded-lg py-3 font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    winner === name
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  <AvatarIcon avatar={playerFor(name)?.avatar ?? null} className="w-6 h-6" />
                  {name}
                </button>
              ))}
            </div>

            <button
              disabled={!winner}
              onClick={() => winner && resolvePuttOff(winner)}
              className="w-full rounded-lg bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-neutral-900 font-bold py-2.5"
            >
              Confirm putt-off winner
            </button>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Waiting for the host to record the putt-off winner…</p>
        )}
      </div>

      {isSpectator ? (
        <div className="space-y-3">
          <PredictionPicker dark />
          <EmojiReactionBar dark />
        </div>
      ) : (
        state.spectators.length > 0 && <PredictionPicker dark readOnly />
      )}
      </div>
    </div>
  );
}
