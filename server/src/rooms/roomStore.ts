import { v4 as uuid } from "uuid";
import {
  AVATAR_KEYS,
  COURSE_NAME,
  PARS,
  type AvatarKey,
  type HoleEntry,
  type Player,
  type Room,
  type RoomStateForClient,
} from "./types.js";
import {
  buildHolesOrder,
  computeHoleResult,
  computeRunningTotals,
  findHoleInOneWinner,
  findTiedLeaders,
  finalizeRound,
} from "./gameLogic.js";
import { persistRound } from "../lib/persistRound.js";

const rooms = new Map<string, Room>();

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join(
      "",
    );
  } while (rooms.has(code));
  return code;
}

function initEntries(): Record<number, HoleEntry> {
  const entries: Record<number, HoleEntry> = {};
  for (let holeNumber = 1; holeNumber <= 9; holeNumber++) {
    entries[holeNumber] = {
      holeNumber,
      par: PARS[holeNumber - 1],
      strokes: {},
      bucketWinners: [],
      pgeEnabled: false,
      pgeWinners: [],
    };
  }
  return entries;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function createRoom(hostName: string): { room: Room; player: Player } {
  const code = generateRoomCode();
  const player: Player = { id: uuid(), name: hostName.trim(), avatar: null, connected: true, socketId: null };
  const room: Room = {
    code,
    hostId: player.id,
    course: COURSE_NAME,
    startingHole: 1,
    players: [player],
    phase: "lobby",
    entries: initEntries(),
    puttOffWinner: null,
    finishedRound: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return { room, player };
}

export function isNameTaken(room: Room, name: string): boolean {
  return room.players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
}

export function joinRoom(room: Room, name: string): Player | { error: string } {
  if (room.phase !== "lobby") return { error: "This round has already started." };
  if (room.players.length >= 3) return { error: "Room is full (3 players max)." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  if (isNameTaken(room, trimmed)) return { error: "That name is already taken in this room." };
  const player: Player = { id: uuid(), name: trimmed, avatar: null, connected: true, socketId: null };
  room.players.push(player);
  return player;
}

export function isAvatarTaken(room: Room, avatar: AvatarKey, excludePlayerId: string): boolean {
  return room.players.some((p) => p.id !== excludePlayerId && p.avatar === avatar);
}

export function setPlayerAvatar(room: Room, playerId: string, avatar: AvatarKey): boolean {
  if (!AVATAR_KEYS.includes(avatar)) return false;
  if (isAvatarTaken(room, avatar, playerId)) return false;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;
  player.avatar = avatar;
  return true;
}

export function setConfig(room: Room, startingHole: number): void {
  if (room.phase !== "lobby") return;
  if (startingHole < 1 || startingHole > 9) return;
  room.startingHole = Math.round(startingHole);
}

export function canStart(room: Room): boolean {
  return (
    room.phase === "lobby" &&
    room.players.length >= 2 &&
    room.players.length <= 3 &&
    room.players.every((p) => p.avatar !== null)
  );
}

export function startGame(room: Room): boolean {
  if (!canStart(room)) return false;
  room.entries = initEntries();
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.phase = "playing";
  return true;
}

export function startNewRound(room: Room): void {
  room.entries = initEntries();
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.phase = "lobby";
}

export function removePlayer(room: Room, playerId: string): void {
  room.players = room.players.filter((p) => p.id !== playerId);
}

function playerNames(room: Room): string[] {
  return room.players.map((p) => p.name);
}

function orderedResults(room: Room) {
  const order = buildHolesOrder(room.startingHole);
  const names = playerNames(room);
  return order.map((holeNumber) => computeHoleResult(room.entries[holeNumber], names));
}

/** Recomputes results after a scoring mutation and auto-advances the room's
 * phase for outcomes that don't need host confirmation: a hole-in-one wins
 * instantly, and a tie moves straight to the putt-off (which already waits
 * on the host to resolve it). A clear win on the last hole waits for the
 * host to explicitly confirm via confirmFinishRound — see that function. */
export async function recomputeAndMaybeFinish(room: Room): Promise<void> {
  if (room.phase !== "playing") return;
  const names = playerNames(room);
  const results = orderedResults(room);

  const holeInOnePlayer = findHoleInOneWinner(results);
  if (holeInOnePlayer) {
    const round = finalizeRound({
      course: room.course,
      players: names,
      startingHole: room.startingHole,
      holes: results,
      holeInOnePlayer,
      puttOffWinner: null,
    });
    room.finishedRound = round;
    room.phase = "celebration";
    await persistRound(round);
    return;
  }

  const allComplete = results.every((h) => names.every((n) => h.strokes[n] > 0));
  if (!allComplete) return;

  const totals = computeRunningTotals(results, names);
  const tied = findTiedLeaders(totals, names);
  if (tied.length > 1) {
    room.phase = "puttoff";
  }
}

/** Host-only explicit confirmation that locks in a completed round once
 * there's a clear winner (no tie, no hole-in-one — those finish on their
 * own). Returns false if the round isn't actually ready to finish yet. */
export async function confirmFinishRound(room: Room): Promise<boolean> {
  if (room.phase !== "playing") return false;
  const names = playerNames(room);
  const results = orderedResults(room);

  const allComplete = results.every((h) => names.every((n) => h.strokes[n] > 0));
  if (!allComplete) return false;

  const totals = computeRunningTotals(results, names);
  if (findTiedLeaders(totals, names).length > 1) return false;

  const round = finalizeRound({
    course: room.course,
    players: names,
    startingHole: room.startingHole,
    holes: results,
    holeInOnePlayer: null,
    puttOffWinner: null,
  });
  room.finishedRound = round;
  room.phase = "celebration";
  await persistRound(round);
  return true;
}

export async function resolvePuttOff(room: Room, winnerName: string): Promise<boolean> {
  if (room.phase !== "puttoff") return false;
  const names = playerNames(room);
  if (!names.includes(winnerName)) return false;
  const results = orderedResults(room);
  const round = finalizeRound({
    course: room.course,
    players: names,
    startingHole: room.startingHole,
    holes: results,
    holeInOnePlayer: null,
    puttOffWinner: winnerName,
  });
  room.finishedRound = round;
  room.puttOffWinner = winnerName;
  room.phase = "celebration";
  await persistRound(round);
  return true;
}

export function serializeRoomState(room: Room): RoomStateForClient {
  const names = playerNames(room);
  const results = orderedResults(room);
  const totals = computeRunningTotals(results, names);
  const tiedLeaders = room.phase === "puttoff" ? findTiedLeaders(totals, names) : [];
  return {
    code: room.code,
    hostId: room.hostId,
    course: room.course,
    startingHole: room.startingHole,
    players: room.players.map(({ socketId: _socketId, ...pub }) => pub),
    phase: room.phase,
    results,
    totals,
    tiedLeaders,
    puttOffWinner: room.puttOffWinner,
    finishedRound: room.finishedRound,
  };
}
