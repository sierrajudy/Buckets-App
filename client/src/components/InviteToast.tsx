import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import { useRoom } from "../store";
import type { RoomPhase } from "../types";

interface InvitePayload {
  roomCode: string;
  inviterName: string;
  phase: RoomPhase;
}

/** Global, always-mounted (see App.tsx) — a friend invite can arrive no
 * matter what screen you're on, since it's account-wide presence, not tied
 * to any particular room. Auto-dismisses after 10s, matching the "notify
 * for about 10 seconds" behavior asked for. A lobby-phase invite tries to
 * join as a player; if that fails (the room filled up, or started, in the
 * time it took to respond) it falls back to spectating automatically rather
 * than just erroring, since spectating is always available as the fallback
 * per how invites are supposed to work. */
export function InviteToast() {
  const { joinRoom, spectateRoom } = useRoom();
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onInvite(payload: InvitePayload) {
      setInvite(payload);
    }
    socket.on("friend:invited", onInvite);
    return () => {
      socket.off("friend:invited", onInvite);
    };
  }, []);

  useEffect(() => {
    if (!invite) return;
    const timer = setTimeout(() => setInvite(null), 10_000);
    return () => clearTimeout(timer);
  }, [invite]);

  if (!invite) return null;

  async function handleAccept() {
    setBusy(true);
    const target = invite!;
    if (target.phase === "lobby") {
      const res = await joinRoom(target.roomCode);
      if (!res.ok) await spectateRoom(target.roomCode);
    } else {
      await spectateRoom(target.roomCode);
    }
    setBusy(false);
    setInvite(null);
  }

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm bg-neutral-900 border border-green-500/40 rounded-2xl shadow-lg p-4 flex items-center gap-3"
        style={{ animation: "pop-in 0.3s ease-out" }}
      >
        <div className="text-2xl shrink-0">⛳</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{invite.inviterName} invited you</div>
          <div className="text-xs text-neutral-400">
            Room {invite.roomCode} · {invite.phase === "lobby" ? "starting soon" : "live now"}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={handleAccept}
            className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
          >
            {invite.phase === "lobby" ? "Join" : "Watch"}
          </button>
          <button
            type="button"
            onClick={() => setInvite(null)}
            className="rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs px-2.5 py-1.5"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
