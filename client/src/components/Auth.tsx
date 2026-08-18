import { useState } from "react";
import { useAuth } from "../authStore";
import { forgotPassword } from "../lib/authApi";

export function Auth() {
  const { signup, login } = useAuth();
  const [mode, setMode] = useState<"signup" | "login" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "forgot") {
      setBusy(true);
      try {
        await forgotPassword(email.trim());
        setForgotSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
      setBusy(false);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const res =
      mode === "signup" ? await signup(email.trim(), password, name.trim()) : await login(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  function switchMode(m: "signup" | "login" | "forgot") {
    setMode(m);
    setError(null);
    setForgotSent(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-neutral-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-green-100 dark:border-green-900 p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-green-700 dark:text-green-400 tracking-tight">Buckets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {mode === "forgot" ? "Reset your password" : "Sign in to play and keep your stats across every round"}
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="flex gap-2">
            {(["signup", "login"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${
                  mode === m
                    ? "bg-green-600 text-white border-green-600"
                    : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                {m === "signup" ? "Create account" : "Log in"}
              </button>
            ))}
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What your group will see"
              maxLength={20}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {mode === "forgot" && forgotSent ? (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              If <span className="font-medium">{email}</span> has an account, we've sent a link to reset the
              password. It expires in 1 hour.
            </p>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-sm font-semibold text-green-700 dark:text-green-400 hover:underline"
            >
              Back to log in
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Password"}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Same password again"
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-sm text-neutral-500 hover:text-green-600 dark:hover:text-green-400"
              >
                Forgot password?
              </button>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
            >
              {busy
                ? "One sec…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "login"
                    ? "Log in"
                    : "Send reset link"}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-sm text-neutral-500 hover:text-green-600 dark:hover:text-green-400 py-1"
              >
                Back to log in
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
}
