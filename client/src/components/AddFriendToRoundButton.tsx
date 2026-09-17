import { useEffect, useState } from "react";
import { useRoom } from "../store";
import { fetchFriendsOverview, type FriendUser } from "../lib/friendsApi";

/** A "🤝 Add friend" button + dropdown, shared by the Lobby (seats them as a
 * player if there's an open slot) and the Scorecard (seats them as a
 * spectator, since the roster's locked mid-round) — see addFriendToRoom on
 * the server for how it decides. No accept step on their end: they're
 * seated immediately and just get notified where to go (a live pop-up if
 * they're online, otherwise an email with the room code). */
export function AddFriendToRoundButton({ dark = false }: { dark?: boolean }) {
  const { addFriendToRoom } = useRoom();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-sm ${dark ? "text-white/70 hover:text-white" : "text-neutral-500 hover:text-green-600 dark:hover:text-green-400"}`}
      >
        🤝 Add friend
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 z-40 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-3 space-y-2 text-left">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Add a friend to this round
            </div>
            {friends === null && <p className="text-xs text-neutral-500">Loading…</p>}
            {friends !== null && friends.length === 0 && (
              <p className="text-xs text-neutral-500">
                No friends yet — add some from the 🤝 Friends page on Home.
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
                      className="rounded-lg border border-green-600 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-40"
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
