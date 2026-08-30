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
  computeBaseballHoleResult,
  computeHighLowHoleResult,
  computeHoleResult,
  computeRunningTotals,
  computeWolfHoleResult,
  findHoleInOneWinner,
  findTiedLeaders,
  finalizeHighLowRound,
  finalizeRound,
} from "./gameLogic.js";
import { persistRound } from "../lib/persistRound.js";
import { notifyStandings } from "../lib/notifications.js";
import { checkAndAwardAchievementsForRound } from "../lib/achievements.js";

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
      wolfPartner: null,
      wolfAlone: false,
    };
  }
  return entries;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

/** Every room currently live in memory, regardless of phase — backs the
 * "watch a live game" listing (see routes/rooms.ts). Unlike room
 * memberships this isn't account-specific: any signed-in user can spectate
 * any room, so there's nothing to filter down to here. */
export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

/** Called once at startup with whatever loadRoomSnapshots() found in the
 * DB — repopulates the in-memory Map so every room that was live right
 * before the process last stopped (a redeploy, a crash) is back exactly as
 * it was, instead of just gone. */
export function restoreRoomsFromSnapshots(snapshots: Room[]): void {
  for (const room of snapshots) {
    // A finishedRound saved before newAchievements existed as a field has
    // it missing entirely (undefined, not {}) — the Celebration screen can
    // still be showing that old round to whoever's in it (the host never
    // clicked "New round"), and reads round.newAchievements[name]
    // unconditionally. Backfilling here heals it for every restored room
    // in one place, rather than relying only on the client's own
    // defensive fallback.
    if (room.finishedRound && !room.finishedRound.newAchievements) {
      room.finishedRound.newAchievements = {};
    }
    // Same deal for isGuest — harmless as undefined (falsy, reads the same
    // as false) but normalized here anyway so it's never anything but a
    // real boolean once a room's been through this.
    for (const p of room.players) {
      if (p.isGuest === undefined) p.isGuest = false;
    }
    rooms.set(room.code, room);
  }
}

/** Updates every in-memory room's Player entry for this name (case-
 * insensitive) to a newly-equipped costume — called right after the REST
 * equip endpoint updates their account, so a costume change shows up in
 * any room they currently have open immediately instead of only on their
 * next reconnect (create/join/rejoin are the only other spots a Player's
 * equippedCostume gets set — this covers the gap while they're already
 * connected). Returns the rooms actually touched, so the caller can
 * broadcast just those instead of every room. */
export function updateEquippedCostumeForName(name: string, costume: string | null): Room[] {
  const lower = name.trim().toLowerCase();
  const touched: Room[] = [];
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.name.toLowerCase() === lower);
    if (player) {
      player.equippedCostume = costume;
      touched.push(room);
    }
  }
  return touched;
}

export function createRoom(hostName: string, equippedCostume: string | null = null): { room: Room; player: Player } {
  const code = generateRoomCode();
  const player: Player = {
    id: uuid(),
    name: hostName.trim(),
    avatar: null,
    connected: true,
    socketId: null,
    handicap: 0,
    equippedCostume,
    isGuest: false,
  };
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
    wolfOrder: null,
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

export function joinRoom(room: Room, name: string, equippedCostume: string | null = null): Player | { error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  // A room that's already left the lobby can still be rejoined this way —
  // but only by someone who's already on its roster, matched by name (the
  // same identity check room:rejoin itself uses). This is the recovery
  // path for a host/player who lost the local session that the normal
  // silent auto-rejoin depends on — a new device, a cleared browser, a
  // crashed app reinstalled — and would otherwise have no way back into
  // their own in-progress round at all. A genuine outsider (no name
  // match) still gets turned away same as before.
  if (room.phase !== "lobby") {
    const existing = room.players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      existing.connected = true;
      existing.equippedCostume = equippedCostume;
      return existing;
    }
    return { error: "This round has already started." };
  }

  if (room.players.length >= 4) return { error: "Room is full (4 players max)." };
  if (isNameTaken(room, trimmed)) return { error: "That name is already taken in this room." };
  const wasEmpty = room.players.length === 0;
  const player: Player = {
    id: uuid(),
    name: trimmed,
    avatar: null,
    connected: true,
    socketId: null,
    handicap: 0,
    equippedCostume,
    isGuest: false,
  };
  room.players.push(player);
  room.teams = null; // a new roster invalidates any prior team pairing
  // A lobby the host deliberately left down to zero players has no one left
  // for hostId to point to (removePlayer only hands it off when there's
  // still someone else in the room) — whoever joins next inherits it rather
  // than landing in a room that can never be started, since nothing else
  // will ever reassign it.
  if (wasEmpty) room.hostId = player.id;
  return player;
}

/** Host-only: adds a name slot for someone without a Buckets account at
 * all — no login, no email, and (since there's no account) nothing saved
 * to a personal round history afterward. The round itself still records
 * their name and scores same as anyone, and any other player can enter
 * their strokes, same as everyone else. Auto-assigned an available
 * avatar since there's no session on the other end to pick one — with
 * only 8 avatars and a 4-player cap there's always one free. Allowed
 * mid-round too (someone shows up late), not just from the lobby. */
export function addGuest(room: Room, name: string): Player | { error: string } {
  if (room.phase !== "lobby" && room.phase !== "playing") {
    return { error: "Can't add a guest right now." };
  }
  if (room.players.length >= 4) return { error: "Room is full (4 players max)." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  if (isNameTaken(room, trimmed)) return { error: "That name is already taken in this room." };

  const takenAvatars = new Set(room.players.map((p) => p.avatar));
  const avatar = AVATAR_KEYS.find((a) => !takenAvatars.has(a)) ?? null;

  const player: Player = {
    id: uuid(),
    name: trimmed,
    avatar,
    connected: true,
    socketId: null,
    handicap: 0,
    equippedCostume: null,
    isGuest: true,
  };
  room.players.push(player);
  if (room.phase === "lobby") room.teams = null;
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
  if (mode !== "standard" && mode !== "highlow" && mode !== "wolf" && mode !== "baseball") return false;
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
  if (room.gameMode === "wolf") {
    return room.players.length === 4;
  }
  if (room.gameMode === "baseball") {
    return room.players.length === 3;
  }
  return room.players.length >= 2 && room.players.length <= 4;
}

/** Wolf's rotation is fixed for the whole round: a random player for the
 * first hole played, then the room's other three in roster order after
 * that — decided once here so it stays stable across every re-render and
 * reconnect instead of being re-rolled on each state computation. */
function buildWolfOrder(room: Room): [string, string, string, string] {
  const names = playerNames(room);
  const offset = Math.floor(Math.random() * 4);
  return [0, 1, 2, 3].map((i) => names[(offset + i) % 4]) as [string, string, string, string];
}

export function startGame(room: Room): boolean {
  if (!canStart(room)) return false;
  room.entries = initEntries(room.courseId);
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.predictions = {};
  room.phase = "playing";
  room.currentStep = 0;
  room.wolfOrder = room.gameMode === "wolf" ? buildWolfOrder(room) : null;
  return true;
}

export function startNewRound(room: Room): void {
  room.entries = initEntries(room.courseId);
  room.puttOffWinner = null;
  room.finishedRound = null;
  room.predictions = {};
  room.phase = "lobby";
  room.currentStep = 0;
  room.wolfOrder = null;
}

export function removePlayer(room: Room, playerId: string): void {
  const wasHost = room.hostId === playerId;
  room.players = room.players.filter((p) => p.id !== playerId);
  // Only invalidate teams pre-game — nulling them out from under an
  // in-progress highlow round would break its scoring outright.
  if (room.phase === "lobby") room.teams = null;
  // The host leaving (not just disconnecting — this is the deliberate
  // "Leave" action, which actually drops them from the roster) can't be
  // allowed to leave the room with no host at all: every host-gated action
  // — starting the round, picking a course, ending/finishing it — would
  // become permanently unreachable for whoever's left. Handing it to
  // whoever's next in the roster keeps the room usable; if that empties the
  // roster too, there's no host to reassign to and the room is just done.
  if (wasHost && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
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
  if (room.gameMode === "wolf" && room.wolfOrder) {
    const wolfOrder = room.wolfOrder;
    return order.map((holeNumber, i) => computeWolfHoleResult(room.entries[holeNumber], wolfOrder[i % 4], names));
  }
  if (room.gameMode === "baseball") {
    return order.map((holeNumber) => computeBaseballHoleResult(room.entries[holeNumber], names));
  }
  return order.map((holeNumber) => computeHoleResult(room.entries[holeNumber], names));
}

/** The wolf's name for a given hole number, derived from the round's fixed
 * rotation and that hole's position in play order — used to validate a
 * wolf-choice mutation without trusting the client to say who the wolf is. */
function wolfNameForHole(room: Room, holeNumber: number): string | null {
  if (room.gameMode !== "wolf" || !room.wolfOrder) return null;
  const holeCount = getCourse(room.courseId)?.pars.length ?? 0;
  const order = buildHolesOrder(room.startingHole, holeCount);
  const i = order.indexOf(holeNumber);
  if (i === -1) return null;
  return room.wolfOrder[i % 4];
}

/** Host-only, "wolf" mode only: records the wolf's choice for a hole —
 * either a specific partner or going alone. Setting one clears the other. */
export function setWolfChoice(room: Room, holeNumber: number, partner: string | null, alone: boolean): boolean {
  if (room.phase !== "playing" || room.gameMode !== "wolf") return false;
  const entry = room.entries[holeNumber];
  if (!entry) return false;
  const wolfName = wolfNameForHole(room, holeNumber);
  if (!wolfName) return false;

  if (alone) {
    entry.wolfAlone = true;
    entry.wolfPartner = null;
    return true;
  }
  if (partner === null) {
    entry.wolfAlone = false;
    entry.wolfPartner = null;
    return true;
  }
  if (partner === wolfName || !playerNames(room).includes(partner)) return false;
  entry.wolfAlone = false;
  entry.wolfPartner = partner;
  return true;
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
          gameMode: room.gameMode,
        });
  // Persisted BEFORE the achievement check runs — achievements.ts's stats
  // query reads straight from the rounds table, so this specific round has
  // to already be in there or a just-crossed threshold (e.g. "First Tee",
  // literally just needing 1 round played) would look one round short and
  // silently miss its own moment.
  await persistRound(round);

  // Checked (and awaited) before the round is ever assigned/broadcast, so
  // any newly-earned achievements are already sitting on
  // round.newAchievements by the time the client sees this round at all —
  // the celebration screen's unlock popup just reads it straight off
  // state.finishedRound, no separate fetch or later update needed.
  round.newAchievements = await checkAndAwardAchievementsForRound(names);

  room.finishedRound = round;
  room.phase = "celebration";
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
export type FinishResult = { ok: true } | { ok: false; error: string };

export async function confirmFinishRound(room: Room): Promise<FinishResult> {
  if (room.phase !== "playing") return { ok: false, error: "This round isn't in progress." };
  const names = playerNames(room);
  const results = orderedResults(room);

  const allComplete = results.every((h) => names.every((n) => h.strokes[n] > 0));
  if (!allComplete) {
    return { ok: false, error: "Every hole needs a score for every player before you can finish — use End Game instead to wrap it up early." };
  }

  if (room.gameMode !== "highlow") {
    const totals = computeRunningTotals(results, names);
    if (findTiedLeaders(totals, names).length > 1) {
      return { ok: false, error: "Scores are tied for the lead — that goes to a putt-off, not a manual finish." };
    }
  }

  await finalizeAndPersist(room, results, { holeInOnePlayer: findHoleInOneWinner(results), puttOffWinner: null });
  return { ok: true };
}

/** Host-only: ends the round right now, whatever hole it's on. Whatever
 * holes have scores count as played; anything not yet entered contributes
 * nothing (same as it would mid-round), so this just finalizes with the
 * totals as they currently stand — no "all holes complete" or "no tie"
 * requirement like confirmFinishRound has, since the whole point is to
 * cut the round short deliberately. */
export async function endGameEarly(room: Room): Promise<FinishResult> {
  if (room.phase !== "playing") return { ok: false, error: "This round isn't in progress." };
  const results = orderedResults(room);
  await finalizeAndPersist(room, results, { holeInOnePlayer: findHoleInOneWinner(results), puttOffWinner: null });
  return { ok: true };
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
