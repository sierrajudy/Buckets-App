import { useEffect, useState } from "react";
import { useRoom } from "../store";
import { onPendingCountChange, pendingScoreCount } from "../lib/scoreQueue";

/** A thin status strip for the Scorecard header — invisible the vast
 * majority of the time (nothing pending, connection fine), and only shows
 * up when there's something the player should know: either they're
 * offline right now, or they have scores queued that haven't synced yet
 * (which can linger briefly even right after coming back online, until the
 * queued retries actually land). See scoreQueue.ts for the underlying
 * offline-tolerant queue this reports on. */
export function SyncStatusBanner() {
  const { state } = useRoom();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!state) return;
    setPending(pendingScoreCount(state.code));
    return onPendingCountChange(setPending);
  }, [state?.code]);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (pending === 0 && online) return null;

  return (
    <div
      className={`max-w-2xl mx-auto mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-center ${
        online
          ? "bg-warning-100 text-warning-800 dark:bg-warning-950 dark:text-warning-300"
          : "bg-danger-100 text-danger-800 dark:bg-danger-950 dark:text-danger-300"
      }`}
    >
      {online
        ? `⏳ Syncing ${pending} score${pending === 1 ? "" : "s"}…`
        : "📡 You're offline — scores you enter will sync once you're back online"}
    </div>
  );
}
