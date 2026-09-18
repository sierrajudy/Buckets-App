import { useEffect, useRef, useState } from "react";
import { useRoom } from "../store";
import { onPendingCountChange, pendingScoreCount } from "../lib/scoreQueue";

const JUST_SYNCED_MS = 2500;

/** A thin status strip for the Scorecard header — invisible the vast
 * majority of the time (nothing pending, connection fine), and only shows
 * up when there's something the player should know: either they're
 * offline right now, they have scores queued that haven't synced yet
 * (which can linger briefly even right after coming back online, until the
 * queued retries actually land), or — briefly, right after a pending queue
 * just drained — a "synced" confirmation, so coming back from a dead spot
 * ends with a visible "it worked" instead of the banner just vanishing.
 * See scoreQueue.ts for the underlying offline-tolerant queue this reports
 * on. */
export function SyncStatusBanner() {
  const { state } = useRoom();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [justSynced, setJustSynced] = useState(false);
  const prevPendingRef = useRef(0);

  useEffect(() => {
    if (!state) return;
    const initial = pendingScoreCount(state.code);
    prevPendingRef.current = initial;
    setPending(initial);
    return onPendingCountChange((count) => {
      if (prevPendingRef.current > 0 && count === 0) setJustSynced(true);
      prevPendingRef.current = count;
      setPending(count);
    });
  }, [state?.code]);

  useEffect(() => {
    if (!justSynced) return;
    const t = setTimeout(() => setJustSynced(false), JUST_SYNCED_MS);
    return () => clearTimeout(t);
  }, [justSynced]);

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

  if (pending === 0 && online && !justSynced) return null;

  const showSynced = pending === 0 && online && justSynced;

  return (
    <div
      className={`max-w-2xl mx-auto mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-center ${
        showSynced
          ? "bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300"
          : online
            ? "bg-warning-100 text-warning-800 dark:bg-warning-950 dark:text-warning-300"
            : "bg-danger-100 text-danger-800 dark:bg-danger-950 dark:text-danger-300"
      }`}
    >
      {showSynced
        ? "✅ Synced"
        : online
          ? `⏳ Syncing ${pending} score${pending === 1 ? "" : "s"}…`
          : "📡 You're offline — scores you enter will sync once you're back online"}
    </div>
  );
}
