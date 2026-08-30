import type { Server, Socket } from "socket.io";
import {
  addGuest,
  advanceCurrentStep,
  canStart,
  confirmFinishRound,
  createRoom,
  endGameEarly,
  getRoom,
  joinRoom,
  recomputeAndMaybeFinish,
  removePlayer,
  removeSpectator,
  resolvePuttOff,
  serializeRoomState,
  setConfig,
  setCourse,
  setGameMode,
  setPlayerAvatar,
  setPlayerHandicap,
  setPrediction,
  setTeams,
  setWolfChoice,
  spectateRoom,
  startGame,
  startNewRound,
} from "./roomStore.js";
import type { AvatarKey, GameMode, Room, Teams } from "./types.js";
import { getUserById, type AuthUser } from "../lib/auth.js";
import { notifyRoundStarted } from "../lib/notifications.js";
import { saveRoomSnapshot } from "../lib/persistRoomSnapshot.js";
import { recordRoomMembership } from "../lib/roomMemberships.js";
import { areFriends } from "../lib/friends.js";
import { isUserOnline, userPresenceRoom } from "../lib/presence.js";
import { tryConsumeInviteCooldown } from "../lib/inviteCooldown.js";
import { sendSpectateInviteEmail } from "../lib/email.js";

interface SocketData {
  roomCode?: string;
  playerId?: string;
  spectatorId?: string;
  user: AuthUser;
}

type Ack = (res: { ok: true; [key: string]: unknown } | { ok: false; error: string }) => void;

export function broadcast(io: Server, room: Room) {
  io.to(room.code).emit("room:state", serializeRoomState(room));
  saveRoomSnapshot(room);
}

function isHost(room: Room, playerId: string | undefined): boolean {
  return Boolean(playerId) && room.hostId === playerId;
}

/** Any of the room's actual players (host included) — as opposed to a
 * spectator. Scoring itself was host-only for a long time as a side effect
 * of everything else in the lobby/setup flow being host-gated, not because
 * it needed to be; players asked for this directly after a trip where the
 * host got tied up and nobody else could enter a score in the meantime. */
function isPlayerInRoom(room: Room, playerId: string | undefined): boolean {
  return Boolean(playerId) && room.players.some((p) => p.id === playerId);
}

export function registerRoomHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    // See presence.ts — every authenticated socket sits in its own
    // account-wide room for as long as it's connected, independent of
    // whatever Buckets room (if any) it's currently in. This is what makes
    // "is this friend online" and "push them a live invite" both work.
    socket.join(userPresenceRoom(data.user.id));

    socket.on("room:create", (_payload: unknown, ack: Ack) => {
      const { room, player } = createRoom(data.user.name, data.user.equippedCostume);
      player.socketId = socket.id;
      data.roomCode = room.code;
      data.playerId = player.id;
      socket.join(room.code);
      saveRoomSnapshot(room); // no one else to broadcast to yet, so this is the only save site for a fresh room
      recordRoomMembership(data.user.id, room.code, "player");
      ack({ ok: true, playerId: player.id, state: serializeRoomState(room) });
    });

    socket.on("room:join", (payload: { code: string }, ack: Ack) => {
      const code = (payload?.code ?? "").trim().toUpperCase();
      const room = getRoom(code);
      if (!room) return ack({ ok: false, error: "Room not found." });
      const result = joinRoom(room, data.user.name, data.user.equippedCostume);
      if ("error" in result) return ack({ ok: false, error: result.error });
      result.socketId = socket.id;
      data.roomCode = room.code;
      data.playerId = result.id;
      socket.join(room.code);
      broadcast(io, room);
      recordRoomMembership(data.user.id, room.code, "player");
      ack({ ok: true, playerId: result.id, state: serializeRoomState(room) });
    });

    socket.on("room:spectate", (payload: { code: string }, ack: Ack) => {
      const code = (payload?.code ?? "").trim().toUpperCase();
      const room = getRoom(code);
      if (!room) return ack({ ok: false, error: "Room not found." });
      const result = spectateRoom(room, data.user.name);
      if ("error" in result) return ack({ ok: false, error: result.error });
      result.socketId = socket.id;
      data.roomCode = room.code;
      data.spectatorId = result.id;
      socket.join(room.code);
      broadcast(io, room);
      recordRoomMembership(data.user.id, room.code, "spectator");
      ack({ ok: true, playerId: result.id, spectator: true, state: serializeRoomState(room) });
    });

    socket.on("room:rejoin", (payload: { code: string; playerId: string }, ack: Ack) => {
      const code = (payload?.code ?? "").trim().toUpperCase();
      const room = getRoom(code);
      if (!room) return ack({ ok: false, error: "Room no longer exists." });

      const player = room.players.find((p) => p.id === payload?.playerId);
      if (player && player.name === data.user.name) {
        player.connected = true;
        player.socketId = socket.id;
        player.equippedCostume = data.user.equippedCostume; // pick up any profile change since they last connected
        data.roomCode = room.code;
        data.playerId = player.id;
        socket.join(room.code);
        broadcast(io, room);
        recordRoomMembership(data.user.id, room.code, "player");
        return ack({ ok: true, playerId: player.id, state: serializeRoomState(room) });
      }

      const spectator = room.spectators.find((s) => s.id === payload?.playerId);
      if (spectator && spectator.name === data.user.name) {
        spectator.socketId = socket.id;
        data.roomCode = room.code;
        data.spectatorId = spectator.id;
        socket.join(room.code);
        broadcast(io, room);
        recordRoomMembership(data.user.id, room.code, "spectator");
        return ack({ ok: true, playerId: spectator.id, spectator: true, state: serializeRoomState(room) });
      }

      ack({ ok: false, error: "You're not in this room." });
    });

    socket.on("room:selectAvatar", (payload: { avatar: AvatarKey }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !data.playerId) return;
      if (setPlayerAvatar(room, data.playerId, payload?.avatar)) broadcast(io, room);
    });

    socket.on("room:setConfig", (payload: { startingHole: number }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      setConfig(room, Number(payload?.startingHole));
      broadcast(io, room);
    });

    socket.on("room:setCourse", (payload: { courseId: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      if (setCourse(room, payload?.courseId)) broadcast(io, room);
    });

    socket.on("room:setGameMode", (payload: { mode: GameMode }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      if (setGameMode(room, payload?.mode)) broadcast(io, room);
    });

    socket.on("room:setTeams", (payload: { teams: Teams }, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can set teams." });
      if (!setTeams(room, payload?.teams)) return ack?.({ ok: false, error: "Teams must be the room's 4 current players, split 2 and 2." });
      broadcast(io, room);
      ack?.({ ok: true });
    });

    socket.on("room:setHandicap", (payload: { playerId: string; handicap: number }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      if (setPlayerHandicap(room, payload?.playerId, Number(payload?.handicap))) broadcast(io, room);
    });

    socket.on("room:start", (_payload: unknown, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can start." });
      if (!room.courseId) return ack?.({ ok: false, error: "Pick a course before starting." });
      if (!canStart(room)) {
        const error =
          room.gameMode === "highlow"
            ? "High Low needs exactly 4 players with teams set and an avatar each."
            : "Need 2-4 players, each with an avatar chosen.";
        return ack?.({ ok: false, error });
      }
      startGame(room);
      broadcast(io, room);
      ack?.({ ok: true });
      notifyRoundStarted({ players: room.players.map((p) => p.name), course: room.course!, roomCode: room.code });
    });

    socket.on("room:newRound", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      startNewRound(room);
      broadcast(io, room);
    });

    socket.on("room:addGuest", (payload: { name: string }, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can add a guest." });
      const result = addGuest(room, String(payload?.name ?? ""));
      if ("error" in result) return ack?.({ ok: false, error: result.error });
      broadcast(io, room);
      ack?.({ ok: true, playerId: result.id });
    });

    // Any player (not just the host) can invite a friend into their current
    // room — pre-game this fills an open player slot if there is one
    // (joinRoom already falls a full room's would-be player back to
    // spectating — see the client's accept handler), mid-game it's always
    // just an invite to spectate, since the roster is locked by then. A
    // friend who's online right now gets a live pop-up; otherwise they get
    // an email with the room code and a link. See presence.ts and
    // inviteCooldown.ts for how each of those is decided.
    socket.on("room:inviteFriend", async (payload: { friendUserId: string }, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room) return ack?.({ ok: false, error: "You're not in a room." });
      if (!isPlayerInRoom(room, data.playerId)) {
        return ack?.({ ok: false, error: "Only players in the room can send invites." });
      }

      const friendUserId = String(payload?.friendUserId ?? "");
      if (!friendUserId) return ack?.({ ok: false, error: "Missing friend." });

      const isFriend = await areFriends(data.user.id, friendUserId);
      if (!isFriend) return ack?.({ ok: false, error: "That's not one of your friends." });

      if (!tryConsumeInviteCooldown(data.user.id, friendUserId, room.code)) {
        return ack?.({ ok: false, error: "Give it a few seconds before inviting them again." });
      }

      const friend = await getUserById(friendUserId);
      if (!friend) return ack?.({ ok: false, error: "Couldn't find that friend." });

      if (isUserOnline(io, friendUserId)) {
        io.to(userPresenceRoom(friendUserId)).emit("friend:invited", {
          roomCode: room.code,
          inviterName: data.user.name,
          phase: room.phase,
        });
        return ack?.({ ok: true, delivered: "live" });
      }

      sendSpectateInviteEmail(friend.email, friend.name, { inviterName: data.user.name, roomCode: room.code }).catch(
        (err) => console.error("Failed to send spectate invite email:", err),
      );
      ack?.({ ok: true, delivered: "email" });
    });

    socket.on("room:leave", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room) return;
      if (data.playerId) removePlayer(room, data.playerId);
      else if (data.spectatorId) removeSpectator(room, data.spectatorId);
      else return;
      socket.leave(room.code);
      broadcast(io, room);
      data.roomCode = undefined;
      data.playerId = undefined;
      data.spectatorId = undefined;
    });

    socket.on("hole:setStrokes", (payload: { holeNumber: number; targetName: string; strokes: number }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isPlayerInRoom(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      if (!room.players.some((p) => p.name === payload.targetName)) return;
      const strokes = Number(payload.strokes);
      entry.strokes[payload.targetName] = Number.isFinite(strokes) && strokes > 0 ? strokes : null;
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:toggleBucket", (payload: { holeNumber: number; targetName: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isPlayerInRoom(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      entry.bucketWinners = entry.bucketWinners.includes(payload.targetName)
        ? entry.bucketWinners.filter((n) => n !== payload.targetName)
        : [...entry.bucketWinners, payload.targetName];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:setPgeEnabled", (payload: { holeNumber: number; enabled: boolean }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isPlayerInRoom(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      entry.pgeEnabled = Boolean(payload.enabled);
      if (!entry.pgeEnabled) entry.pgeWinners = [];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:togglePgeWinner", (payload: { holeNumber: number; targetName: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isPlayerInRoom(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry || !entry.pgeEnabled) return;
      entry.pgeWinners = entry.pgeWinners.includes(payload.targetName)
        ? entry.pgeWinners.filter((n) => n !== payload.targetName)
        : [...entry.pgeWinners, payload.targetName];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:setWolfChoice", (payload: { holeNumber: number; partner: string | null; alone: boolean }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isPlayerInRoom(room, data.playerId) || room.phase !== "playing") return;
      if (setWolfChoice(room, Number(payload?.holeNumber), payload?.partner ?? null, Boolean(payload?.alone))) {
        recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
      }
    });

    socket.on("room:confirmFinish", (_payload: unknown, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can finish the round." });
      confirmFinishRound(room).then((result) => {
        if (result.ok) broadcast(io, room);
        ack?.(result);
      });
    });

    socket.on("room:endGame", (_payload: unknown, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can end the round." });
      endGameEarly(room).then((result) => {
        if (result.ok) broadcast(io, room);
        ack?.(result);
      });
    });

    socket.on("spectator:predict", (payload: { playerName: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !data.spectatorId) return;
      if (setPrediction(room, data.spectatorId, payload?.playerName)) broadcast(io, room);
    });

    // Ephemeral only — never stored in room state, just relayed live to
    // everyone else in the room for the floating-reaction animation.
    socket.on("spectator:react", (payload: { emoji: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !data.spectatorId) return;
      const spectator = room.spectators.find((s) => s.id === data.spectatorId);
      if (!spectator) return;
      const emoji = typeof payload?.emoji === "string" ? payload.emoji.slice(0, 8) : "";
      if (!emoji) return;
      io.to(room.code).emit("spectator:reacted", { emoji, name: spectator.name });
    });

    socket.on("hole:setCurrentStep", (payload: { stepIndex: number }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      advanceCurrentStep(room, Number(payload?.stepIndex)).then((ok) => {
        if (ok) broadcast(io, room);
      });
    });

    socket.on("puttoff:resolve", (payload: { winner: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      resolvePuttOff(room, payload?.winner).then((ok) => {
        if (ok) broadcast(io, room);
      });
    });

    socket.on("disconnect", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room) return;

      if (data.playerId) {
        const player = room.players.find((p) => p.id === data.playerId);
        // Only flip to disconnected if no newer connection (e.g. a reload,
        // or the same player open in another tab) has since taken over.
        if (player && player.socketId === socket.id) {
          player.connected = false;
          broadcast(io, room);
        }
        return;
      }

      if (data.spectatorId) {
        const spectator = room.spectators.find((s) => s.id === data.spectatorId);
        // Same "still my socket" guard, but spectators are lightweight —
        // just drop them outright so the watching-count stays accurate,
        // rather than lingering in a permanent "reconnecting" state.
        if (spectator && spectator.socketId === socket.id) {
          removeSpectator(room, data.spectatorId);
          broadcast(io, room);
        }
      }
    });
  });
}
