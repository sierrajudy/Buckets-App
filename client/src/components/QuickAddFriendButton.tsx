import { useState } from "react";
import { addFriendByName } from "../lib/friendsApi";

/** A small "+ friend" link shown next to a co-player's name in the Lobby and
 * on Celebration — the "quick add" flow for people you're already playing
 * with, as an alternative to searching for them later. Adds them
 * immediately (no accept step on their end — see /api/friends/add-by-name).
 * Looks them up by name server-side since these screens only ever have a
 * Room's Player objects, not user ids. */
export function QuickAddFriendButton({
  name,
  dark = false,
  onSent,
}: {
  name: string;
  dark?: boolean;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      title={`Add ${name} as a friend`}
      onClick={async () => {
        setBusy(true);
        setError(false);
        const res = await addFriendByName(name);
        setBusy(false);
        if (res.ok) onSent();
        else setError(true);
      }}
      className={`text-[10px] font-semibold underline underline-offset-2 disabled:opacity-50 ${
        dark ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-primary-600"
      }`}
    >
      {busy ? "…" : error ? "Couldn't add" : "+ friend"}
    </button>
  );
}
