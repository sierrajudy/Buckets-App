import { useEffect, useState } from "react";
import {
  fetchFriendsOverview,
  removeFriend,
  respondToFriendRequest,
  searchFriendCandidates,
  sendFriendRequest,
  type FriendsOverview,
  type SearchResultUser,
} from "../lib/friendsApi";

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

  async function handleSendRequest(userId: string) {
    setBusyId(userId);
    const res = await sendFriendRequest(userId);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    // Re-run the search so this row's status flips to pending/friends
    // immediately instead of waiting for the next full reload.
    if (query.trim().length >= 2) searchFriendCandidates(query.trim()).then(setResults).catch(() => {});
    load();
  }

  async function handleRespond(requestId: string, accept: boolean) {
    setBusyId(requestId);
    const res = await respondToFriendRequest(requestId, accept);
    setBusyId(null);
    if (!res.ok) return setError(res.error);
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
          <h1 className="text-2xl font-extrabold text-green-700 dark:text-green-400">Friends</h1>
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <label className="block text-sm font-semibold text-neutral-500">Find someone by name or email</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing…"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searching && <p className="text-xs text-neutral-500">Searching…</p>}
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{r.name}</span>
                    <span className="ml-2 text-neutral-500">{r.email}</span>
                  </span>
                  <FriendStatusButton status={r.status} busy={busyId === r.id} onAdd={() => handleSendRequest(r.id)} />
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-neutral-500">No one matches that.</p>
          )}
        </div>

        {overview && overview.incoming.length > 0 && (
          <Section title="Friend requests">
            {overview.incoming.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold truncate">{req.user.name}</span>
                <span className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === req.id}
                    onClick={() => handleRespond(req.id, true)}
                    className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === req.id}
                    onClick={() => handleRespond(req.id, false)}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </Section>
        )}

        {overview && overview.suggested.length > 0 && (
          <Section title="People you've played with">
            {overview.suggested.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold truncate">{u.name}</span>
                <button
                  disabled={busyId === u.id}
                  onClick={() => handleSendRequest(u.id)}
                  className="shrink-0 rounded-lg border border-green-600 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1.5 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  {busyId === u.id ? "…" : "+ Add"}
                </button>
              </li>
            ))}
          </Section>
        )}

        {overview && overview.outgoing.length > 0 && (
          <Section title="Sent — waiting on them">
            {overview.outgoing.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{req.user.name}</span>
                <span className="shrink-0 text-xs text-neutral-500">Pending</span>
              </li>
            ))}
          </Section>
        )}

        <Section title={`Your friends${overview ? ` (${overview.friends.length})` : ""}`}>
          {overview && overview.friends.length === 0 && (
            <p className="text-sm text-neutral-500 py-1">
              No friends added yet — search above, or add someone you've played with.
            </p>
          )}
          {overview?.friends.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{f.name}</span>
                <span className="ml-2 text-neutral-500">{f.email}</span>
              </span>
              <button
                disabled={busyId === f.id}
                onClick={() => handleRemove(f.id)}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
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
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
      <div className="text-sm font-semibold text-neutral-500 mb-2">{title}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FriendStatusButton({
  status,
  busy,
  onAdd,
}: {
  status: SearchResultUser["status"];
  busy: boolean;
  onAdd: () => void;
}) {
  if (status === "friends") return <span className="shrink-0 text-xs text-neutral-400">Friends</span>;
  if (status === "pending_out") return <span className="shrink-0 text-xs text-neutral-400">Pending</span>;
  if (status === "pending_in") return <span className="shrink-0 text-xs text-neutral-400">Check requests ↑</span>;
  return (
    <button
      disabled={busy}
      onClick={onAdd}
      className="shrink-0 rounded-lg border border-green-600 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1.5 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-50"
    >
      {busy ? "…" : "+ Add"}
    </button>
  );
}
