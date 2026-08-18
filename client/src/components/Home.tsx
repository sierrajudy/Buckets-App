import { useState } from "react";
import { useAuth } from "../authStore";
import { useRoom } from "../store";

export function Home({
  onViewStandings,
  onViewProfile,
}: {
  onViewStandings: () => void;
  onViewProfile: () => void;
}) {
  const { user, logout } = useAuth();
  const { createRoom, joinRoom } = useRoom();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "create" ? await createRoom() : await joinRoom(code.trim().toUpperCase());
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-neutral-950 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onViewProfile}
        className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        <span aria-hidden>👤</span> Profile
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-green-100 dark:border-green-900 p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-green-700 dark:text-green-400 tracking-tight">Buckets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Play with your foursome, anywhere</p>
        </div>

        <div className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
          <span className="text-neutral-600 dark:text-neutral-300">
            Signed in as <span className="font-semibold text-neutral-900 dark:text-white">{user?.name}</span>
          </span>
          <button type="button" onClick={logout} className="text-neutral-500 hover:text-red-500 font-medium">
            Sign out
          </button>
        </div>

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
                  ? "bg-green-600 text-white border-green-600"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {m === "create" ? "Host a round" : "Join a round"}
            </button>
          ))}
        </div>

        {mode === "join" && (
          <div>
            <label className="block text-sm font-medium mb-1">Room code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDE"
              maxLength={5}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm tracking-[0.3em] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {mode === "create" && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            You'll get a room code to share with the rest of your group, then set up the course and pick your
            avatar. 2-4 players per round.
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
        >
          {busy ? "One sec…" : mode === "create" ? "Create room" : "Join room"}
        </button>

        <button
          type="button"
          onClick={onViewStandings}
          className="w-full text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 py-1"
        >
          View standings & history
        </button>
      </form>
    </div>
  );
}
