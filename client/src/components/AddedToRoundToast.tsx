import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import { useRoom } from "../store";

interface AddedPayload {
  roomCode: string;
  byName: string;
  role: "player" | "spectator";
}

/** Global, always-mounted (see App.tsx) — this can arrive no matter what
 * screen you're on, since it's account-wide presence, not tied to any
 * particular room. Unlike the old invite flow, this is purely informational:
 * the friend is already seated by the time it shows up, so there's just one
 * action — hop in — not an accept/decline choice. */
export function AddedToRoundToast() {
  const { joinRoom, spectateRoom } = useRoom();
  const [notice, setNotice] = useState<AddedPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onAdded(payload: AddedPayload) {
      setNotice(payload);
    }
    socket.on("friend:addedToRound", onAdded);
    return () => {
      socket.off("friend:addedToRound", onAdded);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 12_000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  async function handleOpen() {
    setBusy(true);
    const target = notice!;
    // The role the server decided is authoritative — but if the room moved
    // on in the time it took to click (it filled up, or the round ended),
    // fall back to spectating rather than just erroring.
    const res = target.role === "player" ? await joinRoom(target.roomCode) : await spectateRoom(target.roomCode);
    if (!res.ok && target.role === "player") await spectateRoom(target.roomCode);
    setBusy(false);
    setNotice(null);
  }

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm bg-neutral-900 border border-primary-500/40 rounded-2xl shadow-lg p-4 flex items-center gap-3"
        style={{ animation: "pop-in 0.3s ease-out" }}
      >
        <div className="text-2xl shrink-0">⛳</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{notice.byName} added you to a round</div>
          <div className="text-xs text-neutral-400">
            Room {notice.roomCode} · {notice.role === "player" ? "you're playing" : "spectating"}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={handleOpen}
            className="rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs px-2.5 py-1.5"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
