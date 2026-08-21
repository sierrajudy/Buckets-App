import { v4 as uuid } from "uuid";
import {
  AVATAR_KEYS,
  type AvatarKey,
  type HoleEntry,
  type Player,
  type Room,
  type RoomStateForClient,
  type Spectator,
} from "./types.js";
import { DEFAULT_COURSE_ID, getCourse, isValidCourseId } from "./courses.js";
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

function initEntries(courseId: string): Record<number, HoleEntry> {
  const pars = getCourse(courseId).pars;
  const entries: Record<number, HoleEntry> = {};
  for (let holeNumber = 1; holeNumber <= pars.length; holeNumber++) {
    entries[holeNumber] = {
      holeNumber,
      par: pars[holeNumber - 1],
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
    courseId: DEFAULT_COURSE_ID,
    course: getCourse(DEFAULT_COURSE_ID).name,
    startingHole: 1,
    players: [player],
    spectators: [],
    predictions: {},
    phase: "lobby",
    entries: initEntries(DEFAULT_COURSE_ID),
    puttOffWinner: null,
    finishedRound: null,
    createdAt: Date.now(),
    currentStep: 0,
  };
  rooms.set(code, room);
  return { room, player };
}

export function isNameTaken(room: Room, name: string): boolean {
  const lower = name.trim().toLowerCase();
  return (
    room.players.some((p) => p.name.toLowerCase() === lower) ||
    room.spectators.some((s) => s.name.toLowerCase() === lower)
  );
}

export function joinRoom(room: Room, name: string): Player | { error: string } {
  if (room.phase !== "lobby") return { error: "This round has already started." };
  if (room.players.length >= 4) return { error: "Room is full (4 players max)." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  if (isNameTaken(room, trimmed)) return { error: "That name is already taken in this room." };
  const player: Player = { id: uuid(), name: trimmed, avatar: null, connected: true, socketId: null };
  room.players.push(player);
  return player;
}

/** Spectators can join anytime — before the round starts or mid-round —
 * unlike players, who are locked out once the lobby closes. They don't
 * count toward the 2-4 player cap and never touch the entries/scoring. */
export function spectateRoom(room: Room, name: string): Spectator | { error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  if (isNameTaken(room, trimmed)) return { error: "That name is already taken in this room." };
  const spectator: Spectator = { id: uuid(), name: trimmed, socketId: null };
  room.spectators.push(spectator);
  return spectator;
}

export function removeSpectator(room: Room, spectatorId: string): void {
  room.spectators = room.spectators.filter((s) => s.id !== spectatorId);
  delete room.predictions[spectatorId];
}

/** A spectator's just-for-fun pick of who they think will win the current
 * round — no real stakes, purely a live tally for engagement. */
export function setPrediction(room: Room, spectatorId: string, playerName: string): boolean {
  if (!room.spectators.some((s) => s.id === spectatorId)) return false;
  if (!room.players.some((p) => p.name === playerName)) return false;
  room.predictions[spectatorId] = playerName;
  return true;
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
  const holeCount = getCourse(room.courseId).pars.length;
  if (startingHole < 1 || startingHole > holeCount) return;
  room.startingHole = Math.round(startingHole);
}

/** Host-only: switches the room's course. Re-initializes the hole entries
 * to match the new course's par values and hole count, and resets the
 * starting hole since it may no longer be in range. */
export function setCourse(room: Room, courseId: string): boolean {
  if (room.phase !== "lobby") return false;
  if (!isValidCourseId(courseId)) return false;
  room.courseId = courseId;
  room.course = getCourse(courseId).name;
  room.entries = initEntries(courseId);
  room.startingHole = 1;
  return true;
}

export function canStart(room: Room): boolean {
  return (
    room.phase === "lobby" &&
    room.players.length >= 2 &&
    room.players.length <= 4 &&
    room.players.every((p) => p.avatar !== null)
  );
}

export function startGame(room: Room): boolean {
  if (!canStart(room)) return false;
  room.entries = initEntries(room.courseId);
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.predictions = {};
  room.phase = "playing";
  room.currentStep = 0;
  return true;
}

export function startNewRound(room: Room): void {
  room.entries = initEntries(room.courseId);
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.predictions = {};
  room.phase = "lobby";
  room.currentStep = 0;
}

export function removePlayer(room: Room, playerId: string): void {
  room.players = room.players.filter((p) => p.id !== playerId);
}

function playerNames(room: Room): string[] {
  return room.players.map((p) => p.name);
}

function orderedResults(room: Room) {
  const holeCount = getCourse(room.courseId).pars.length;
  const order = buildHolesOrder(room.startingHole, holeCount);
  const names = playerNames(room);
  return order.map((holeNumber) => computeHoleResult(room.entries[holeNumber], names));
}

/** Recomputes results after a scoring mutation. A hole-in-one no longer
 * ends the match on its own — the host still has to confirm it by moving
 * on (see advanceCurrentStep) or finishing the round. The only automatic
 * transition left is a tie on the final hole, which moves straight to the
 * putt-off (itself still waiting on the host to resolve it). */
export async function recomputeAndMaybeFinish(room: Room): Promise<void> {
  if (room.phase !== "playing") return;
  const names = playerNames(room);
  const results = orderedResults(room);

  const allComplete = results.every((h) => names.every((n) => h.strokes[n] > 0));
  if (!allComplete) return;

  const totals = computeRunningTotals(results, names);
  const tied = findTiedLeaders(totals, names);
  if (tied.length > 1) {
    room.phase = "puttoff";
  }
}

/** Host-only: moves the room's shared "current hole" pointer forward, which
 * drives guests' auto-follow view and lets a reconnecting client resume at
 * the host's real position instead of always restarting at hole 1.
 *
 * If the hole being left had a hole-in-one, this is also where the match
 * actually ends — the host confirms it by advancing past it, rather than
 * the round finishing the instant the ace is entered (which could fire
 * before the other players even had a turn on that hole). */
export async function advanceCurrentStep(room: Room, stepIndex: number): Promise<boolean> {
  if (room.phase !== "playing") return false;
  const names = playerNames(room);
  const results = orderedResults(room);
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= results.length) return false;

  const justLeft = results[stepIndex - 1];
  if (justLeft && justLeft.holeInOnePlayers.length > 0) {
    const round = finalizeRound({
      course: room.course,
      players: names,
      startingHole: room.startingHole,
      holes: results,
      holeInOnePlayer: justLeft.holeInOnePlayers[0],
      puttOffWinner: null,
    });
    room.finishedRound = round;
    room.phase = "celebration";
    await persistRound(round);
    return true;
  }

  room.currentStep = stepIndex;
  return true;
}

/** Host-only explicit confirmation that locks in a completed round once
 * there's a clear winner. Returns false if the round isn't actually ready
 * to finish yet (a hole still missing scores, or a tie with no winner). */
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
    holeInOnePlayer: findHoleInOneWinner(results),
    puttOffWinner: null,
  });
  room.finishedRound = round;
  room.phase = "celebration";
  await persistRound(round);
  return true;
}

/** Host-only: ends the round right now, whatever hole it's on. Whatever
 * holes have scores count as played; anything not yet entered contributes
 * nothing (same as it would mid-round), so this just finalizes with the
 * totals as they currently stand — no "all holes complete" or "no tie"
 * requirement like confirmFinishRound has, since the whole point is to
 * cut the round short deliberately. */
export async function endGameEarly(room: Room): Promise<boolean> {
  if (room.phase !== "playing") return false;
  const names = playerNames(room);
  const results = orderedResults(room);

  const round = finalizeRound({
    course: room.course,
    players: names,
    startingHole: room.startingHole,
    holes: results,
    holeInOnePlayer: findHoleInOneWinner(results),
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
    courseId: room.courseId,
    course: room.course,
    startingHole: room.startingHole,
    players: room.players.map(({ socketId: _socketId, ...pub }) => pub),
    spectators: room.spectators.map(({ socketId: _socketId, ...pub }) => pub),
    predictions: room.predictions,
    phase: room.phase,
    results,
    totals,
    tiedLeaders,
    puttOffWinner: room.puttOffWinner,
    finishedRound: room.finishedRound,
    currentStep: room.currentStep,
  };
}
