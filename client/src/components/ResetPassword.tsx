import { useState } from "react";
import { resetPassword } from "../lib/authApi";

function getTokenFromUrl(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function ResetPassword() {
  const [token] = useState(getTokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  }

  function goToLogin() {
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-green-100 dark:border-green-900 p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-green-700 dark:text-green-400 tracking-tight">Buckets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Set a new password</p>
        </div>

        {!token && (
          <p className="text-sm text-red-500 text-center">
            This link is missing its reset code. Request a new one from the log in screen.
          </p>
        )}

        {token && done && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Your password has been updated. Any other devices you were signed in on have been logged out for
              security.
            </p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5"
            >
              Log in
            </button>
          </div>
        )}

        {token && !done && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Same password again"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
            >
              {busy ? "One sec…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
