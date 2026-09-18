import { socket } from "./socket";

interface QueuedAction {
  id: string;
  event: string;
  payload: Record<string, unknown>;
}

interface AckResponse {
  ok: boolean;
  error?: string;
}

const STORAGE_PREFIX = "buckets:pendingActions:";
// Long enough that a real ack from a healthy connection always beats it,
// short enough that a genuinely dropped connection doesn't leave the score
// looking "sent" for too long before the pending indicator shows up.
const ACK_TIMEOUT_MS = 6000;

function storageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode}`;
}

function loadQueue(roomCode: string): QueuedAction[] {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(roomCode: string, queue: QueuedAction[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(storageKey(roomCode));
    else localStorage.setItem(storageKey(roomCode), JSON.stringify(queue));
  } catch {
    // localStorage full or unavailable (private browsing) — the in-memory
    // attempt below still goes out for this session, it just won't survive
    // a reload if it doesn't land before then.
  }
}

type Listener = (pendingCount: number) => void;
const listeners = new Set<Listener>();

/** Subscribed to by Scorecard's pending-sync indicator — fires with the
 * current queue length for the given room every time it changes. */
export function onPendingCountChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(roomCode: string): void {
  const count = loadQueue(roomCode).length;
  listeners.forEach((fn) => fn(count));
}

const inFlight = new Set<string>();

function attemptSend(roomCode: string, item: QueuedAction): void {
  if (!socket.connected || inFlight.has(item.id)) return;
  inFlight.add(item.id);

  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    inFlight.delete(item.id);
    // No ack in time — leave it queued. The next "connect" (a real
    // reconnect, since this one apparently didn't survive) or "online"
    // event retries it.
  }, ACK_TIMEOUT_MS);

  socket.emit(item.event, item.payload, (res?: AckResponse) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    inFlight.delete(item.id);
    // Removed on success AND on an explicit rejection — retrying "you're
    // not in this room" or "invalid hole" will never succeed no matter how
    // many times it's replayed. Only a timeout (no response at all,
    // meaning the connection dropped mid-request) keeps it queued.
    if (!res || res.ok || res.ok === false) {
      const queue = loadQueue(roomCode).filter((q) => q.id !== item.id);
      saveQueue(roomCode, queue);
      notify(roomCode);
    }
  });
}

/** Fires a scoring action immediately if connected, and persists it to
 * localStorage either way so it survives a dropped connection, a
 * backgrounded tab, or even the page reloading before it lands — flushQueue
 * (called on reconnect and on the browser's "online" event) resends
 * anything still pending. Safe to call for the same logical change
 * multiple times in a row (e.g. tapping +1 repeatedly while offline): every
 * one of these five scoring events carries either an absolute value or a
 * plain toggle, so replaying the full queued sequence in order always
 * lands on the same end state a live connection would have produced. */
export function enqueueScoreAction(roomCode: string, event: string, payload: Record<string, unknown>): void {
  const item: QueuedAction = { id: crypto.randomUUID(), event, payload };
  const queue = loadQueue(roomCode);
  queue.push(item);
  saveQueue(roomCode, queue);
  notify(roomCode);
  attemptSend(roomCode, item);
}

/** Retries every still-pending action for this room, in the order they
 * were originally made. Called on socket reconnect and on the browser
 * "online" event — either can fire without the other depending on exactly
 * how connectivity came back. */
export function flushScoreQueue(roomCode: string): void {
  for (const item of loadQueue(roomCode)) attemptSend(roomCode, item);
}

export function pendingScoreCount(roomCode: string): number {
  return loadQueue(roomCode).length;
}

export function clearScoreQueue(roomCode: string): void {
  saveQueue(roomCode, []);
}
