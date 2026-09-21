import { describe, expect, it } from "vitest";
import { createRoom, getRoom, pruneExpiredRooms } from "./roomStore.js";
import type { RoomPhase } from "./types.js";

const HOUR_MS = 60 * 60 * 1000;

/** Creates a room and backdates it / sets its phase, same shape
 * pruneExpiredRooms actually inspects — a real room only ever reaches
 * these states by playing through the lobby/game/celebration flow, but
 * pruning only cares about phase and createdAt, so setting them directly
 * is enough to exercise it in isolation. */
function makeRoom(phase: RoomPhase, ageMs: number): string {
  const { room } = createRoom(`host-${Math.random()}`);
  room.phase = phase;
  room.createdAt = Date.now() - ageMs;
  return room.code;
}

describe("pruneExpiredRooms", () => {
  it("leaves a fresh lobby room alone", () => {
    const code = makeRoom("lobby", 0);
    const removed = pruneExpiredRooms();
    expect(removed).not.toContain(code);
    expect(getRoom(code)).toBeDefined();
  });

  it("removes an open lobby room older than 24 hours", () => {
    const code = makeRoom("lobby", 25 * HOUR_MS);
    const removed = pruneExpiredRooms();
    expect(removed).toContain(code);
    expect(getRoom(code)).toBeUndefined();
  });

  it("removes an open in-progress round older than 24 hours", () => {
    const code = makeRoom("playing", 25 * HOUR_MS);
    const removed = pruneExpiredRooms();
    expect(removed).toContain(code);
    expect(getRoom(code)).toBeUndefined();
  });

  it("leaves a finished round alone no matter how old", () => {
    const code = makeRoom("celebration", 30 * 24 * HOUR_MS);
    const removed = pruneExpiredRooms();
    expect(removed).not.toContain(code);
    expect(getRoom(code)).toBeDefined();
  });

  it("leaves an open round just under 24 hours old alone", () => {
    const code = makeRoom("lobby", 23 * HOUR_MS);
    const removed = pruneExpiredRooms();
    expect(removed).not.toContain(code);
    expect(getRoom(code)).toBeDefined();
  });
});
