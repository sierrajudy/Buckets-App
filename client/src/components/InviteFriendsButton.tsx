import { useEffect, useState } from "react";
import { useRoom } from "../store";
import { fetchFriendsOverview, type FriendUser } from "../lib/friendsApi";

const COOLDOWN_MS = 10_000;

/** A "🤝 Invite friends" button + dropdown, shared by the Lobby (invite to
 * fill an open player slot) and the Scorecard (invite to spectate live) —
 * the server decides which one actually happens based on room phase, this
 * is just the picker. Per-friend cooldown here is a client-side mirror of
 * the server's own enforcement (see inviteCooldown.ts) purely for UX — the
 * server is still the real gate. */
export function InviteFriendsButton({ dark = false }: { dark?: boolean }) {
  const { inviteFriend } = useRoom();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [sentAt, setSentAt] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || friends !== null) return;
    fetchFriendsOverview()
      .then((ov) => setFriends(ov.friends))
      .catch(() => setFriends([]));
  }, [open, friends]);

  // The cooldown check below reads Date.now() at render time, so without
  // something to force a re-render, a friend's "Invite" button would stay
  // disabled forever after one click instead of coming back after 10s —
  // nothing else naturally re-renders this component once sentAt stops
  // changing. Only ticks while the dropdown is actually open.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [open]);

  async function handleInvite(friend: FriendUser) {
    setSentAt((prev) => ({ ...prev, [friend.id]: Date.now() }));
    setFeedback((prev) => ({ ...prev, [friend.id]: "…" }));
    const res = await inviteFriend(friend.id);
    setFeedback((prev) => ({
      ...prev,
      [friend.id]: res.ok ? (res.delivered === "live" ? "Notified!" : "Emailed!") : res.error,
    }));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-sm ${dark ? "text-white/70 hover:text-white" : "text-neutral-500 hover:text-green-600 dark:hover:text-green-400"}`}
      >
        🤝 Invite friends
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 z-40 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-3 space-y-2 text-left">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Invite a friend</div>
            {friends === null && <p className="text-xs text-neutral-500">Loading…</p>}
            {friends !== null && friends.length === 0 && (
              <p className="text-xs text-neutral-500">
                No friends yet — add some from the 🤝 Friends page on Home.
              </p>
            )}
            <ul className="space-y-1.5">
              {friends?.map((f) => {
                const onCooldown = Date.now() - (sentAt[f.id] ?? 0) < COOLDOWN_MS;
                return (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-neutral-800 dark:text-neutral-200">{f.name}</span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      {feedback[f.id] && <span className="text-[10px] text-neutral-400">{feedback[f.id]}</span>}
                      <button
                        type="button"
                        disabled={onCooldown}
                        onClick={() => handleInvite(f)}
                        className="rounded-lg border border-green-600 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-40"
                      >
                        Invite
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
