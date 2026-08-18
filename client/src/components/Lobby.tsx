import { useState } from "react";
import { useRoom } from "../store";
import { AVATAR_KEYS, AVATAR_META, AvatarIcon, type AvatarKey } from "./Avatars";

export function Lobby({
  onViewStandings,
  onViewProfile,
}: {
  onViewStandings: () => void;
  onViewProfile: () => void;
}) {
  const { state, isHost, me, selectAvatar, setConfig, startGame, leaveRoom } = useRoom();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!state) return null;

  const takenAvatars = new Set(state.players.filter((p) => p.avatar).map((p) => p.avatar));
  const canStart = state.players.length >= 2 && state.players.length <= 3 && state.players.every((p) => p.avatar);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const res = await startGame();
    setStarting(false);
    if (!res.ok) setStartError(res.error ?? "Couldn't start the round.");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state!.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the code is already on screen to read off
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={leaveRoom} className="text-sm text-neutral-500 hover:text-red-500">
            Leave
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={onViewProfile}
              className="text-sm text-neutral-500 hover:text-green-600 dark:hover:text-green-400"
            >
              👤 Profile
            </button>
            <button
              onClick={onViewStandings}
              className="text-sm text-neutral-500 hover:text-green-600 dark:hover:text-green-400"
            >
              Standings
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-center">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">Room code</div>
          <button
            onClick={copyCode}
            className="text-4xl font-black tracking-[0.25em] text-green-700 dark:text-green-400 font-mono"
          >
            {state.code}
          </button>
          <div className="text-xs text-neutral-400 mt-1">{copied ? "Copied!" : "Tap to copy · share with your group"}</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm font-semibold text-neutral-500 mb-1">Course</div>
          <div className="font-semibold">{state.course}</div>

          {isHost ? (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Starting hole</label>
              <select
                value={state.startingHole}
                onChange={(e) => setConfig(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Array.from({ length: 9 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    Hole {h}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm text-neutral-500 mt-1">Starting hole {state.startingHole}</div>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm font-semibold text-neutral-500 mb-3">
            Players ({state.players.length}/3)
          </div>
          <div className="space-y-2">
            {state.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <AvatarIcon avatar={p.avatar} className="w-10 h-10 shrink-0" />
                <span className="font-medium">{p.name}</span>
                {p.id === state.hostId && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
                {p.id === me?.id && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
                {!p.connected && <span className="text-[10px] text-neutral-400 ml-auto">reconnecting…</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm font-semibold text-neutral-500 mb-3">Pick your avatar</div>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_KEYS.map((key) => {
              const takenByOther = takenAvatars.has(key) && me?.avatar !== key;
              const selected = me?.avatar === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={takenByOther}
                  onClick={() => selectAvatar(key as AvatarKey)}
                  className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition-all ${
                    selected
                      ? "border-green-600 bg-green-50 dark:bg-green-950"
                      : takenByOther
                        ? "border-transparent opacity-30 cursor-not-allowed"
                        : "border-transparent hover:border-green-300"
                  }`}
                >
                  <AvatarIcon avatar={key as AvatarKey} className="w-12 h-12" />
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                    {AVATAR_META[key as AvatarKey].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {startError && <p className="text-sm text-red-500 text-center">{startError}</p>}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3"
          >
            {starting ? "Starting…" : "Start round"}
          </button>
        ) : (
          <p className="text-center text-sm text-neutral-500 py-2">
            {canStart ? "Waiting for the host to start the round…" : "Waiting for everyone to pick an avatar…"}
          </p>
        )}
      </div>
    </div>
  );
}
