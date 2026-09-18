import { useEffect, useState } from "react";
import { Handshake, User } from "lucide-react";
import { useAuth } from "../authStore";
import { useRoom } from "../store";
import { RulesModal } from "./RulesModal";
import { fetchActiveRooms, fetchRecentRooms, type ActiveRoom, type RecentRoom } from "../lib/roomsApi";

const PHASE_LABEL: Record<string, string> = {
  lobby: "Setting up",
  playing: "In progress",
  puttoff: "Putt-off",
  celebration: "Just finished",
};

export function Home({
  onViewStandings,
  onViewProfile,
  onViewFriends,
}: {
  onViewStandings: () => void;
  onViewProfile: () => void;
  onViewFriends: () => void;
}) {
  const { user, logout } = useAuth();
  const { createRoom, joinRoom, spectateRoom } = useRoom();
  const codeFromLink = new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? "";
  const [mode, setMode] = useState<"create" | "join">(codeFromLink ? "join" : "create");
  const [asSpectator, setAsSpectator] = useState(false);
  const [code, setCode] = useState(codeFromLink);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [rejoiningCode, setRejoiningCode] = useState<string | null>(null);

  useEffect(() => {
    if (codeFromLink) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecentRooms()
      .then(setRecentRooms)
      .catch(() => setRecentRooms([]));
    fetchActiveRooms()
      .then(setActiveRooms)
      .catch(() => setActiveRooms([]));
  }, []);

  /** A "recent" room rejoins in whatever role the account last had there —
   * a player gets put right back on the roster (see roomStore.ts's rejoin-
   * by-name fallback in joinRoom), a spectator just resumes watching. An
   * "active" room (someone else's live game) is always joined as a
   * spectator — this list is for watching, not muscling into someone
   * else's roster. */
  async function rejoin(targetCode: string, role: "player" | "spectator") {
    setRejoiningCode(targetCode);
    setError(null);
    const res = role === "spectator" ? await spectateRoom(targetCode) : await joinRoom(targetCode);
    setRejoiningCode(null);
    if (!res.ok) setError(res.error ?? "Couldn't get back into that room.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "create"
        ? await createRoom()
        : asSpectator
          ? await spectateRoom(code.trim().toUpperCase())
          : await joinRoom(code.trim().toUpperCase());
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-neutral-950 flex flex-col p-4">
      <div className="flex items-center justify-end gap-2 pt-2 pb-6 sm:pb-10">
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Rules
        </button>
        <button
          type="button"
          onClick={onViewFriends}
          className="flex items-center gap-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <Handshake size={16} aria-hidden /> Friends
        </button>
        <button
          type="button"
          onClick={onViewProfile}
          className="flex items-center gap-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <User size={16} aria-hidden /> Profile
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-auto mb-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-primary-100 dark:border-primary-900 p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-primary-700 dark:text-primary-400 tracking-tight">Buckets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Play with your foursome, anywhere</p>
        </div>

        <div className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
          <span className="text-neutral-600 dark:text-neutral-300">
            Signed in as <span className="font-semibold text-neutral-900 dark:text-white">{user?.name}</span>
          </span>
          <button type="button" onClick={logout} className="text-neutral-500 hover:text-danger-500 font-medium">
            Sign out
          </button>
        </div>

        {recentRooms.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Get back in
            </p>
            <div className="space-y-1.5">
              {recentRooms.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  disabled={rejoiningCode !== null}
                  onClick={() => rejoin(r.code, r.role)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold tracking-widest text-sm">{r.code}</span>
                    <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {rejoiningCode === r.code ? "…" : PHASE_LABEL[r.phase] ?? r.phase}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {r.course ?? "Round"} · {r.players.join(", ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeRooms.filter((r) => !recentRooms.some((rr) => rr.code === r.code)).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Watch a live game
            </p>
            <div className="space-y-1.5">
              {activeRooms
                .filter((r) => !recentRooms.some((rr) => rr.code === r.code))
                .map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    disabled={rejoiningCode !== null}
                    onClick={() => rejoin(r.code, "spectator")}
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold tracking-widest text-sm">{r.code}</span>
                      <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {rejoiningCode === r.code ? "…" : PHASE_LABEL[r.phase] ?? r.phase}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {r.course ?? "Round"} · {r.players.join(", ")}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(["create", "join"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
                mode === m
                  ? "bg-primary-600 text-white border-primary-600"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {m === "create" ? "Host a round" : "Join a round"}
            </button>
          ))}
        </div>

        {mode === "join" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Room code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm tracking-[0.3em] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex gap-2">
              {[
                { value: false, label: "Join as a player" },
                { value: true, label: "Just watching" },
              ].map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setAsSpectator(opt.value)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold border ${
                    asSpectator === opt.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {asSpectator && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You'll watch the scorecard live — no avatar, no editing, just following along. Works even if the
                round already started.
              </p>
            )}
          </div>
        )}

        {mode === "create" && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            You'll get a room code to share with the rest of your group, then set up the course and pick your
            avatar. 2-4 players per round.
          </p>
        )}

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
        >
          {busy
            ? "One sec…"
            : mode === "create"
              ? "Create room"
              : asSpectator
                ? "Start watching"
                : "Join room"}
        </button>

        <button
          type="button"
          onClick={onViewStandings}
          className="w-full text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 py-1"
        >
          View standings & history
        </button>
      </form>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
