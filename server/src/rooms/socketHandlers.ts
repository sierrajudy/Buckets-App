import type { Server, Socket } from "socket.io";
import {
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
  setPlayerAvatar,
  setPrediction,
  spectateRoom,
  startGame,
  startNewRound,
} from "./roomStore.js";
import type { AvatarKey, Room } from "./types.js";
import type { AuthUser } from "../lib/auth.js";

interface SocketData {
  roomCode?: string;
  playerId?: string;
  spectatorId?: string;
  user: AuthUser;
}

type Ack = (res: { ok: true; [key: string]: unknown } | { ok: false; error: string }) => void;

function broadcast(io: Server, room: Room) {
  io.to(room.code).emit("room:state", serializeRoomState(room));
}

function isHost(room: Room, playerId: string | undefined): boolean {
  return Boolean(playerId) && room.hostId === playerId;
}

export function registerRoomHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on("room:create", (_payload: unknown, ack: Ack) => {
      const { room, player } = createRoom(data.user.name);
      player.socketId = socket.id;
      data.roomCode = room.code;
      data.playerId = player.id;
      socket.join(room.code);
      ack({ ok: true, playerId: player.id, state: serializeRoomState(room) });
    });

    socket.on("room:join", (payload: { code: string }, ack: Ack) => {
      const code = (payload?.code ?? "").trim().toUpperCase();
      const room = getRoom(code);
      if (!room) return ack({ ok: false, error: "Room not found." });
      const result = joinRoom(room, data.user.name);
      if ("error" in result) return ack({ ok: false, error: result.error });
      result.socketId = socket.id;
      data.roomCode = room.code;
      data.playerId = result.id;
      socket.join(room.code);
      broadcast(io, room);
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
        data.roomCode = room.code;
        data.playerId = player.id;
        socket.join(room.code);
        broadcast(io, room);
        return ack({ ok: true, playerId: player.id, state: serializeRoomState(room) });
      }

      const spectator = room.spectators.find((s) => s.id === payload?.playerId);
      if (spectator && spectator.name === data.user.name) {
        spectator.socketId = socket.id;
        data.roomCode = room.code;
        data.spectatorId = spectator.id;
        socket.join(room.code);
        broadcast(io, room);
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

    socket.on("room:start", (_payload: unknown, ack?: Ack) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return ack?.({ ok: false, error: "Only the host can start." });
      if (!canStart(room)) return ack?.({ ok: false, error: "Need 2-4 players, each with an avatar chosen." });
      startGame(room);
      broadcast(io, room);
      ack?.({ ok: true });
    });

    socket.on("room:newRound", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      startNewRound(room);
      broadcast(io, room);
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
      if (!room || !isHost(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      if (!room.players.some((p) => p.name === payload.targetName)) return;
      const strokes = Number(payload.strokes);
      entry.strokes[payload.targetName] = Number.isFinite(strokes) && strokes > 0 ? strokes : null;
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:toggleBucket", (payload: { holeNumber: number; targetName: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      entry.bucketWinners = entry.bucketWinners.includes(payload.targetName)
        ? entry.bucketWinners.filter((n) => n !== payload.targetName)
        : [...entry.bucketWinners, payload.targetName];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:setPgeEnabled", (payload: { holeNumber: number; enabled: boolean }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry) return;
      entry.pgeEnabled = Boolean(payload.enabled);
      if (!entry.pgeEnabled) entry.pgeWinners = [];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("hole:togglePgeWinner", (payload: { holeNumber: number; targetName: string }) => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId) || room.phase !== "playing") return;
      const entry = room.entries[payload?.holeNumber];
      if (!entry || !entry.pgeEnabled) return;
      entry.pgeWinners = entry.pgeWinners.includes(payload.targetName)
        ? entry.pgeWinners.filter((n) => n !== payload.targetName)
        : [...entry.pgeWinners, payload.targetName];
      recomputeAndMaybeFinish(room).then(() => broadcast(io, room));
    });

    socket.on("room:confirmFinish", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      confirmFinishRound(room).then((ok) => {
        if (ok) broadcast(io, room);
      });
    });

    socket.on("room:endGame", () => {
      const room = data.roomCode ? getRoom(data.roomCode) : undefined;
      if (!room || !isHost(room, data.playerId)) return;
      endGameEarly(room).then((ok) => {
        if (ok) broadcast(io, room);
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
