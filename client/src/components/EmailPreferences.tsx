import { useState } from "react";
import { useAuth } from "../authStore";

export function EmailPreferences() {
  const { user, updateEmailPreferences } = useAuth();
  const [open, setOpen] = useState(false);
  const [roundStart, setRoundStart] = useState(user?.emailRoundStart ?? false);
  const [standings, setStandings] = useState(user?.emailStandings ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const subscribed = user.emailRoundStart || user.emailStandings;

  function openPanel() {
    setRoundStart(user!.emailRoundStart);
    setStandings(user!.emailStandings);
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await updateEmailPreferences({ emailRoundStart: roundStart, emailStandings: standings });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="w-full text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        <div className="font-semibold">📧 {subscribed ? "Email preferences" : "Join Email List"}</div>
        <div className="text-xs text-neutral-500 mt-0.5">
          {subscribed
            ? [user.emailRoundStart && "Round starts", user.emailStandings && "Final standings"].filter(Boolean).join(" · ")
            : "Get notified when a round starts, or see how it turned out"}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
      <div>
        <div className="font-semibold">📧 Join Email List</div>
        <div className="text-xs text-neutral-500 mt-0.5">
          Get notified about rounds you might want to watch, and see how they turned out afterward.
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={roundStart}
          onChange={(e) => setRoundStart(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-green-600"
        />
        <span>
          <span className="font-medium">🏌️ Round started</span> — email me when a round begins, so I can come
          spectate
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={standings}
          onChange={(e) => setStandings(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-green-600"
        />
        <span>
          <span className="font-medium">🏆 Final standings</span> — email me the results when a round finishes
        </span>
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm py-2"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
