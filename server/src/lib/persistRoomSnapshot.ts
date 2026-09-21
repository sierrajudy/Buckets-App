import { db } from "../db.js";
import type { Room } from "../rooms/types.js";
import { getCourse, registerCourse, type Course } from "../rooms/courses.js";

const SAVE_DEBOUNCE_MS = 800;
const pendingTimers = new Map<string, NodeJS.Timeout>();

interface RoomSnapshotPayload {
  room: Room;
  /** The room's course, captured alongside it — courses.ts's COURSE_CACHE
   * is a plain in-memory Map with nothing of its own persisting it, so
   * without this a restart would restore the room (via room_snapshots)
   * but leave getCourse(room.courseId) returning null for it: every hole
   * computation needs the course's pars/yardages/handicaps, so the
   * scorecard would crash the instant anyone tried to view it. Restored
   * by loadRoomSnapshots calling registerCourse() before the room is ever
   * handed back to roomStore. Null if no course has been picked yet
   * (still in the lobby). */
  course: Course | null;
}

/** Sockets never survive a restart, so every player/spectator comes back
 * marked disconnected in the snapshot — they reconnect for real through
 * the existing room:rejoin flow the moment their client notices and
 * retries, same as any other reconnect. */
function normalizeForSnapshot(room: Room): Room {
  return {
    ...room,
    players: room.players.map((p) => ({ ...p, connected: false, socketId: null })),
    spectators: room.spectators.map((s) => ({ ...s, socketId: null })),
  };
}

/** Fire-and-forget, debounced snapshot of a room's full state (plus its
 * resolved course, see RoomSnapshotPayload), called after every broadcast
 * (see socketHandlers.ts) so a mid-deploy restart can bring every live
 * room back exactly as it was instead of wiping it out from under
 * whoever's mid-round. Debounced per room code so rapid clicking (a host
 * tapping +/- on strokes repeatedly) doesn't hammer the DB with a write
 * per click — a real crash/redeploy still has far more than
 * SAVE_DEBOUNCE_MS of runway before it actually happens. Never awaited by
 * callers and never throws — a snapshot write failing should never break
 * the live game itself, just log and move on. */
export function saveRoomSnapshot(room: Room): void {
  const code = room.code;
  const existing = pendingTimers.get(code);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(code);
    const payload: RoomSnapshotPayload = {
      room: normalizeForSnapshot(room),
      course: getCourse(room.courseId),
    };
    db.execute({
      sql: `INSERT INTO room_snapshots (code, data, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      args: [code, JSON.stringify(payload)],
    }).catch((err) => {
      console.error(`Failed to save room snapshot for ${code}:`, err);
    });
  }, SAVE_DEBOUNCE_MS);
  pendingTimers.set(code, timer);
}

/** Removes a room's saved snapshot — called after roomStore.ts's
 * pruneExpiredRooms drops it from memory, so a redeploy/restart doesn't
 * just resurrect the exact room that was just killed for being stale.
 * Also cancels any debounced save still pending for it, in case it
 * somehow gets pruned in the same tick as its last broadcast. */
export function deleteRoomSnapshot(code: string): void {
  const pending = pendingTimers.get(code);
  if (pending) {
    clearTimeout(pending);
    pendingTimers.delete(code);
  }
  db.execute({ sql: `DELETE FROM room_snapshots WHERE code = ?`, args: [code] }).catch((err) => {
    console.error(`Failed to delete room snapshot for ${code}:`, err);
  });
}

/** Called once at server startup, before any connections are accepted —
 * re-registers each restored room's course (if it had one) back into
 * courses.ts's cache, then returns the rooms themselves for
 * roomStore.ts's restoreRoomsFromSnapshots to repopulate the in-memory
 * Map from — together, the room and its course are back exactly as they
 * were the moment before the process last stopped. */
export async function loadRoomSnapshots(): Promise<Room[]> {
  const res = await db.execute(`SELECT data FROM room_snapshots`);
  const rooms: Room[] = [];
  for (const row of res.rows) {
    const raw = JSON.parse((row as unknown as { data: string }).data) as RoomSnapshotPayload | Room;
    // Snapshots written before this file bundled the course alongside the
    // room are just the Room object directly — detected by the absence of
    // a `room` key (every real payload has one; every real Room has
    // `code` instead). Falls back to no course rather than crashing
    // startup on an old row; that one room stays broken until it's
    // manually recreated, but the server itself comes up fine and every
    // NEW snapshot from here on is self-healing.
    const payload: RoomSnapshotPayload = "room" in raw ? raw : { room: raw, course: null };
    if (payload.course) registerCourse(payload.course);
    rooms.push(payload.room);
  }
  return rooms;
}
