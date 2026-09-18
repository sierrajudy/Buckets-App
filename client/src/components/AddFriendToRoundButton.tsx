import { useEffect, useRef, useState } from "react";
import { Handshake } from "lucide-react";
import { useRoom } from "../store";
import { fetchFriendsOverview, type FriendUser } from "../lib/friendsApi";
import { SkeletonRows } from "./Skeleton";

const PANEL_WIDTH = 256; // matches w-64 below
const VIEWPORT_MARGIN = 8;

/** An "Add friend" button + dropdown, shared by the Lobby (seats them as a
 * player if there's an open slot) and the Scorecard (seats them as a
 * spectator, since the roster's locked mid-round) — see addFriendToRoom on
 * the server for how it decides. No accept step on their end: they're
 * seated immediately and just get notified where to go (a live pop-up if
 * they're online, otherwise an email with the room code).
 *
 * The panel is positioned with `fixed` + a measured, viewport-clamped
 * offset rather than `absolute right-0` against its own trigger button —
 * this button sits well left of the screen edge in both the Lobby and
 * Scorecard, and a naive right-anchored panel wider than the space to the
 * button's right (which it always is here) renders partly off-screen. */
export function AddFriendToRoundButton({ dark = false }: { dark?: boolean }) {
  const { addFriendToRoom } = useRoom();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
      );
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open || friends !== null) return;
    fetchFriendsOverview()
      .then((ov) => setFriends(ov.friends))
      .catch(() => setFriends([]));
  }, [open, friends]);

  async function handleAdd(friend: FriendUser) {
    setBusyId(friend.id);
    setFeedback((prev) => ({ ...prev, [friend.id]: "…" }));
    const res = await addFriendToRoom(friend.id);
    setBusyId(null);
    setFeedback((prev) => ({
      ...prev,
      [friend.id]: res.ok
        ? res.delivered === "already-in"
          ? "Already in!"
          : res.delivered === "live"
            ? "Added — notified!"
            : "Added — emailed!"
        : res.error,
    }));
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`flex items-center gap-1 text-sm ${dark ? "text-white/70 hover:text-white" : "text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"}`}
      >
        <Handshake size={15} aria-hidden /> Add friend
      </button>

      {open && panelPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            style={{ top: panelPos.top, left: panelPos.left }}
            className="fixed w-64 z-40 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-3 space-y-2 text-left"
          >
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Add a friend to this round
            </div>
            {friends === null && <SkeletonRows count={2} withAvatar={false} />}
            {friends !== null && friends.length === 0 && (
              <p className="text-xs text-neutral-500">
                No friends yet — add some from the Friends page on Home.
              </p>
            )}
            <ul className="space-y-1.5">
              {friends?.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-neutral-800 dark:text-neutral-200">{f.name}</span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    {feedback[f.id] && <span className="text-[10px] text-neutral-400">{feedback[f.id]}</span>}
                    <button
                      type="button"
                      disabled={busyId === f.id}
                      onClick={() => handleAdd(f)}
                      className="rounded-lg border border-primary-600 text-primary-700 dark:text-primary-400 text-xs font-semibold px-2.5 py-1 hover:bg-primary-50 dark:hover:bg-primary-950 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
