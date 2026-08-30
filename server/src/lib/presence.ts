import type { Server } from "socket.io";

/** Every authenticated socket joins this room on connect (see
 * socketHandlers.ts) — one Socket.IO room per account, regardless of how
 * many tabs/devices they have open or what Buckets room (if any) they're
 * currently sitting in. Makes "is this account online right now" and "push
 * this account a live event" both a single room lookup, with no separate
 * presence bookkeeping to keep in sync across reconnects. */
export function userPresenceRoom(userId: string): string {
  return `user:${userId}`;
}

/** Whether this account has at least one live socket connected anywhere in
 * the app right now — used to decide whether a friend invite gets a live
 * pop-up or falls back to email. */
export function isUserOnline(io: Server, userId: string): boolean {
  const room = io.sockets.adapter.rooms.get(userPresenceRoom(userId));
  return Boolean(room && room.size > 0);
}
