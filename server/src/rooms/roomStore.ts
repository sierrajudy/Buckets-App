import { v4 as uuid } from "uuid";
import {
  AVATAR_KEYS,
  type AvatarKey,
  type GameMode,
  type HoleEntry,
  type Player,
  type Room,
  type RoomStateForClient,
  type Spectator,
  type Teams,
} from "./types.js";
import { getCourse, isValidCourseId } from "./courses.js";
import {
  buildHolesOrder,
  computeHighLowHoleResult,
  computeHoleResult,
  computeRunningTotals,
  findHoleInOneWinner,
  findTiedLeaders,
  finalizeHighLowRound,
  finalizeRound,
} from "./gameLogic.js";
import { persistRound } from "../lib/persistRound.js";
import { notifyStandings } from "../lib/notifications.js";

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

function initEntries(courseId: string | null): Record<number, HoleEntry> {
  const course = getCourse(courseId);
  if (!course) return {};
  const entries: Record<number, HoleEntry> = {};
  for (let holeNumber = 1; holeNumber <= course.pars.length; holeNumber++) {
    entries[holeNumber] = {
      holeNumber,
      par: course.pars[holeNumber - 1],
      yardage: course.yardages[holeNumber - 1] ?? 0,
      handicap: course.handicaps[holeNumber - 1] ?? 0,
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
  const player: Player = { id: uuid(), name: hostName.trim(), avatar: null, connected: true, socketId: null, handicap: 0 };
  const room: Room = {
    code,
    hostId: player.id,
    courseId: null,
    course: null,
    startingHole: 1,
    players: [player],
    spectators: [],
    predictions: {},
    phase: "lobby",
    entries: {},
    puttOffWinner: null,
    finishedRound: null,
    createdAt: Date.now(),
    currentStep: 0,
    gameMode: "standard",
    teams: null,
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
  const player: Player = { id: uuid(), name: trimmed, avatar: null, connected: true, socketId: null, handicap: 0 };
  room.players.push(player);
  room.teams = null; // a new roster invalidates any prior team pairing
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

/** Host-only, set in the lobby before starting — the player's own handicap
 * doesn't require a self-service control the way avatar does. Clamped to a
 * sane range and rounded to a whole number of strokes. */
export function setPlayerHandicap(room: Room, playerId: string, handicap: number): boolean {
  if (room.phase !== "lobby") return false;
  if (!Number.isFinite(handicap)) return false;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;
  player.handicap = Math.max(0, Math.min(54, Math.round(handicap)));
  return true;
}

export function setConfig(room: Room, startingHole: number): void {
  if (room.phase !== "lobby") return;
  const course = getCourse(room.courseId);
  if (!course) return;
  if (startingHole < 1 || startingHole > course.pars.length) return;
  room.startingHole = Math.round(startingHole);
}

/** Host-only: switches the room's course. Re-initializes the hole entries
 * to match the new course's par values and hole count, and resets the
 * starting hole since it may no longer be in range. */
export function setCourse(room: Room, courseId: string): boolean {
  if (room.phase !== "lobby") return false;
  if (!isValidCourseId(courseId)) return false;
  const course = getCourse(courseId);
  if (!course) return false;
  room.courseId = courseId;
  room.course = course.name;
  room.entries = initEntries(courseId);
  room.startingHole = 1;
  return true;
}

/** Host-only: switches the game mode. Teams are cleared on any change,
 * since a pairing from before could otherwise silently carry over into a
 * mode (or roster) it was never validated against. */
export function setGameMode(room: Room, mode: GameMode): boolean {
  if (room.phase !== "lobby") return false;
  if (mode !== "standard" && mode !== "highlow") return false;
  room.gameMode = mode;
  room.teams = null;
  return true;
}

/** Host-only, "highlow" mode only: pairs up the room's 4 players into two
 * fixed teams. Rejects anything that isn't exactly those 4 names split
 * 2-and-2 with no repeats — a partial or stale roster just doesn't set. */
export function setTeams(room: Room, teams: Teams): boolean {
  if (room.phase !== "lobby" || room.gameMode !== "highlow") return false;
  const flat = teams.flat();
  if (flat.length !== 4) return false;
  if (new Set(flat).size !== 4) return false;
  const roster = new Set(playerNames(room));
  if (roster.size !== 4 || !flat.every((n) => roster.has(n))) return false;
  room.teams = teams;
  return true;
}

export function canStart(room: Room): boolean {
  if (room.phase !== "lobby" || room.courseId === null || !room.players.every((p) => p.avatar !== null)) {
    return false;
  }
  if (room.gameMode === "highlow") {
    return room.players.length === 4 && room.teams !== null;
  }
  return room.players.length >= 2 && room.players.length <= 4;
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
  // Only invalidate teams pre-game — nulling them out from under an
  // in-progress highlow round would break its scoring outright.
  if (room.phase === "lobby") room.teams = null;
}

function playerNames(room: Room): string[] {
  return room.players.map((p) => p.name);
}

function orderedResults(room: Room) {
  const holeCount = getCourse(room.courseId)?.pars.length ?? 0;
  const order = buildHolesOrder(room.startingHole, holeCount);
  const names = playerNames(room);
  if (room.gameMode === "highlow" && room.teams) {
    const teams = room.teams;
    const playerHandicaps = Object.fromEntries(room.players.map((p) => [p.name, p.handicap]));
    return order.map((holeNumber) =>
      computeHighLowHoleResult(room.entries[holeNumber], teams, names, playerHandicaps, holeCount),
    );
  }
  return order.map((holeNumber) => computeHoleResult(room.entries[holeNumber], names));
}

/** Recomputes results after a scoring mutation. A hole-in-one no longer
 * ends the match on its own — the host still has to confirm it by moving
 * on (see advanceCurrentStep) or finishing the round. The only automatic
 * transition left is a tie on the final hole, which moves straight to the
 * putt-off (itself still waiting on the host to resolve it). */
export async function recomputeAndMaybeFinish(room: Room): Promise<void> {
  if (room.phase !== "playing") return;
  if (room.gameMode === "highlow") return; // no putt-off in this mode — a tied overall match just stays tied

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

/** Builds the finished RoundSummary for whichever mode the room is in and
 * persists/notifies it — shared by every "the round just ended" call site
 * below so they don't each have to know how to branch by gameMode. */
async function finalizeAndPersist(
  room: Room,
  results: ReturnType<typeof orderedResults>,
  opts: { holeInOnePlayer: string | null; puttOffWinner: string | null },
): Promise<void> {
  const names = playerNames(room);
  const hostName = room.players.find((p) => p.id === room.hostId)?.name ?? names[0];
  const round =
    room.gameMode === "highlow" && room.teams
      ? finalizeHighLowRound({
          course: room.course!,
          hostName,
          players: names,
          startingHole: room.startingHole,
          holes: results,
          teams: room.teams,
        })
      : finalizeRound({
          course: room.course!,
          hostName,
          players: names,
          startingHole: room.startingHole,
          holes: results,
          holeInOnePlayer: opts.holeInOnePlayer,
          puttOffWinner: opts.puttOffWinner,
        });
  room.finishedRound = round;
  room.phase = "celebration";
  await persistRound(round);
  notifyStandings(round);
}

/** Host-only: moves the room's shared "current hole" pointer forward, which
 * drives guests' auto-follow view and lets a reconnecting client resume at
 * the host's real position instead of always restarting at hole 1.
 *
 * If the hole being left had a hole-in-one, this is also where the match
 * actually ends — the host confirms it by advancing past it, rather than
 * the round finishing the instant the ace is entered (which could fire
 * before the other players even had a turn on that hole). High Low has no
 * such instant-win rule: an ace there just counts toward that hole's
 * low-matchup and bonus points like any other great score. */
export async function advanceCurrentStep(room: Room, stepIndex: number): Promise<boolean> {
  if (room.phase !== "playing") return false;
  const results = orderedResults(room);
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= results.length) return false;

  const justLeft = results[stepIndex - 1];
  if (room.gameMode !== "highlow" && justLeft && justLeft.holeInOnePlayers.length > 0) {
    await finalizeAndPersist(room, results, { holeInOnePlayer: justLeft.holeInOnePlayers[0], puttOffWinner: null });
    return true;
  }

  room.currentStep = stepIndex;
  return true;
}

/** Host-only explicit confirmation that locks in a completed round once
 * there's a clear winner. Returns false if the round isn't actually ready
 * to finish yet (a hole still missing scores, or — standard mode only — a
 * tie with no winner; High Low has no such requirement since a tied match
 * is a valid final result there). */
export async function confirmFinishRound(room: Room): Promise<boolean> {
  if (room.phase !== "playing") return false;
  const names = playerNames(room);
  const results = orderedResults(room);

  const allComplete = results.every((h) => names.every((n) => h.strokes[n] > 0));
  if (!allComplete) return false;

  if (room.gameMode !== "highlow") {
    const totals = computeRunningTotals(results, names);
    if (findTiedLeaders(totals, names).length > 1) return false;
  }

  await finalizeAndPersist(room, results, { holeInOnePlayer: findHoleInOneWinner(results), puttOffWinner: null });
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
  const results = orderedResults(room);
  await finalizeAndPersist(room, results, { holeInOnePlayer: findHoleInOneWinner(results), puttOffWinner: null });
  return true;
}

export async function resolvePuttOff(room: Room, winnerName: string): Promise<boolean> {
  if (room.phase !== "puttoff") return false;
  const names = playerNames(room);
  if (!names.includes(winnerName)) return false;
  const results = orderedResults(room);
  room.puttOffWinner = winnerName;
  await finalizeAndPersist(room, results, { holeInOnePlayer: null, puttOffWinner: winnerName });
  return true;
}

export function serializeRoomState(room: Room): RoomStateForClient {
  const names = playerNames(room);
  const results = orderedResults(room);
  const totals = computeRunningTotals(results, names);
  const tiedLeaders = room.phase === "puttoff" ? findTiedLeaders(totals, names) : [];
  const course = getCourse(room.courseId);
  const courseStats = course
    ? { teeLabel: course.teeLabel, totalYards: course.totalYards, courseRating: course.courseRating, slopeRating: course.slopeRating }
    : null;
  return {
    code: room.code,
    hostId: room.hostId,
    courseId: room.courseId,
    course: room.course,
    courseStats,
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
    gameMode: room.gameMode,
    teams: room.teams,
  };
}
