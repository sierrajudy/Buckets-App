import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { AvatarIcon, type AvatarKey } from "./Avatars";
import {
  addFriend,
  fetchFriendsOverview,
  removeFriend,
  searchFriendCandidates,
  type FriendsOverview,
  type FriendUser,
  type SearchResultUser,
} from "../lib/friendsApi";

/** A friend's equipped costume only ever showed up in Profile's own mini
 * friends list and on FriendProfile's header — this page (search results,
 * "people you've played with", and the friends list itself) rendered every
 * row as plain text with no picture at all, so a costume had nowhere to
 * appear even though the data was already there on every row. */
function FriendAvatar({ friend }: { friend: Pick<FriendUser, "profileAvatar" | "equippedCostume"> }) {
  return (
    <span className="w-8 h-8 shrink-0">
      <AvatarIcon
        avatar={friend.profileAvatar as AvatarKey | null}
        className="w-full h-full"
        costume={friend.equippedCostume}
      />
    </span>
  );
}

export function Friends({ onBack }: { onBack: () => void }) {
  const [overview, setOverview] = useState<FriendsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetchFriendsOverview()
      .then(setOverview)
      .catch(() => setError("Couldn't load your friends."));
  }

  useEffect(load, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchFriendCandidates(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleAdd(userId: string) {
    setBusyId(userId);
    const res = await addFriend(userId);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    // Re-run the search so this row's status flips to "Friends" immediately
    // instead of waiting for the next full reload.
    if (query.trim().length >= 2) searchFriendCandidates(query.trim()).then(setResults).catch(() => {});
    load();
  }

  async function handleRemove(userId: string) {
    setBusyId(userId);
    await removeFriend(userId);
    setBusyId(null);
    load();
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary-700 dark:text-primary-400">Friends</h1>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-primary-500 p-4 space-y-3">
          <label className="flex items-center gap-1.5 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Search size={17} aria-hidden /> Search for friends
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            autoFocus
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searching && <p className="text-xs text-neutral-500">Searching…</p>}
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <FriendAvatar friend={r} />
                  <span className="min-w-0 truncate flex-1">
                    <span className="font-semibold">{r.name}</span>
                    <span className="ml-2 text-neutral-500">{r.email}</span>
                  </span>
                  {r.status === "friends" ? (
                    <span className="shrink-0 text-xs text-neutral-400">Friends</span>
                  ) : (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => handleAdd(r.id)}
                      className="shrink-0 rounded-lg border border-primary-600 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-950 disabled:opacity-50"
                    >
                      {busyId === r.id ? "…" : "+ Add"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-neutral-500">No one matches that.</p>
          )}
        </div>

        {overview && overview.suggested.length > 0 && (
          <Section title="People you've played with">
            {overview.suggested.map((u) => (
              <li key={u.id} className="flex items-center gap-2 text-sm">
                <FriendAvatar friend={u} />
                <span className="font-semibold truncate flex-1">{u.name}</span>
                <button
                  disabled={busyId === u.id}
                  onClick={() => handleAdd(u.id)}
                  className="shrink-0 rounded-lg border border-primary-600 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-950"
                >
                  {busyId === u.id ? "…" : "+ Add"}
                </button>
              </li>
            ))}
          </Section>
        )}

        <Section title={`Your friends${overview ? ` (${overview.friends.length})` : ""}`}>
          {overview && overview.friends.length === 0 && (
            <EmptyState message="No friends added yet — search above, or add someone you've played with." />
          )}
          {overview?.friends.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <FriendAvatar friend={f} />
              <span className="min-w-0 truncate flex-1">
                <span className="font-semibold">{f.name}</span>
                <span className="ml-2 text-neutral-500">{f.email}</span>
              </span>
              <button
                disabled={busyId === f.id}
                onClick={() => handleRemove(f.id)}
                className="shrink-0 text-xs text-neutral-400 hover:text-danger-500"
              >
                Remove
              </button>
            </li>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-1">
      <div className="text-sm font-semibold text-neutral-500 mb-2">{title}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
