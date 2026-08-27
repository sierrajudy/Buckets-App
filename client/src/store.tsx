import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { socket } from "./lib/socket";
import type { AvatarKey, GameMode, RoomState, Teams } from "./types";

const SESSION_KEY = "buckets:session";

interface Session {
  code: string;
  playerId: string;
}

type AckResponse = { ok: true; [key: string]: unknown } | { ok: false; error: string };

function emitWithAck(event: string, payload: unknown): Promise<AckResponse> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (res: AckResponse) => resolve(res));
  });
}

export interface Reaction {
  id: number;
  emoji: string;
  name: string;
}

interface RoomContextValue {
  state: RoomState | null;
  playerId: string | null;
  isHost: boolean;
  isSpectator: boolean;
  me: RoomState["players"][number] | null;
  connecting: boolean;
  createRoom: () => Promise<AckResponse>;
  joinRoom: (code: string) => Promise<AckResponse>;
  spectateRoom: (code: string) => Promise<AckResponse>;
  selectAvatar: (avatar: AvatarKey) => void;
  setConfig: (startingHole: number) => void;
  setCourse: (courseId: string) => void;
  setGameMode: (mode: GameMode) => void;
  setTeams: (teams: Teams) => Promise<AckResponse>;
  setHandicap: (playerId: string, handicap: number) => void;
  startGame: () => Promise<AckResponse>;
  newRound: () => void;
  leaveRoom: () => void;
  setStrokes: (holeNumber: number, targetName: string, strokes: number | null) => void;
  toggleBucket: (holeNumber: number, targetName: string) => void;
  setPgeEnabled: (holeNumber: number, enabled: boolean) => void;
  togglePgeWinner: (holeNumber: number, targetName: string) => void;
  resolvePuttOff: (winner: string) => void;
  confirmFinishRound: () => void;
  endGame: () => void;
  setCurrentStep: (stepIndex: number) => void;
  predict: (playerName: string) => void;
  sendReaction: (emoji: string) => void;
  reactions: Reaction[];
  dismissReaction: (id: number) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const reactionId = useRef(0);

  useEffect(() => {
    function onState(next: RoomState) {
      setState(next);
    }

    function onReaction(payload: { emoji: string; name: string }) {
      reactionId.current += 1;
      const id = reactionId.current;
      setReactions((r) => [...r, { id, emoji: payload.emoji, name: payload.name }]);
    }

    /** Re-runs on every "connect" event, not just the first — a mobile
     * socket disconnects and auto-reconnects constantly (locking the
     * phone, a weak signal, backgrounding the tab), and each reconnect is
     * a brand-new server-side socket with no idea what room it belongs
     * to until this fires again. Without re-running here, the client
     * looks alive (it's still showing the last state it had) but every
     * action silently goes nowhere. */
    function attemptRejoin() {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setConnecting(false);
        return;
      }
      try {
        const session = JSON.parse(raw) as Session;
        socket.emit("room:rejoin", session, (res: AckResponse) => {
          if (res.ok) {
            setPlayerId(res.playerId as string);
            setState(res.state as RoomState);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
          setConnecting(false);
        });
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setConnecting(false);
      }
    }

    socket.on("room:state", onState);
    socket.on("spectator:reacted", onReaction);
    socket.on("connect", attemptRejoin);
    if (socket.connected) attemptRejoin();

    return () => {
      socket.off("room:state", onState);
      socket.off("spectator:reacted", onReaction);
      socket.off("connect", attemptRejoin);
    };
  }, []);

  function persistSession(code: string, id: string) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId: id }));
  }

  async function createRoom(): Promise<AckResponse> {
    const res = await emitWithAck("room:create", {});
    if (res.ok) {
      setPlayerId(res.playerId as string);
      setState(res.state as RoomState);
      persistSession((res.state as RoomState).code, res.playerId as string);
    }
    return res;
  }

  async function joinRoom(code: string): Promise<AckResponse> {
    const res = await emitWithAck("room:join", { code });
    if (res.ok) {
      setPlayerId(res.playerId as string);
      setState(res.state as RoomState);
      persistSession((res.state as RoomState).code, res.playerId as string);
    }
    return res;
  }

  async function spectateRoom(code: string): Promise<AckResponse> {
    const res = await emitWithAck("room:spectate", { code });
    if (res.ok) {
      setPlayerId(res.playerId as string);
      setState(res.state as RoomState);
      persistSession((res.state as RoomState).code, res.playerId as string);
    }
    return res;
  }

  function selectAvatar(avatar: AvatarKey) {
    socket.emit("room:selectAvatar", { avatar });
  }

  function setConfig(startingHole: number) {
    socket.emit("room:setConfig", { startingHole });
  }

  function setCourse(courseId: string) {
    socket.emit("room:setCourse", { courseId });
  }

  function setGameMode(mode: GameMode) {
    socket.emit("room:setGameMode", { mode });
  }

  function setTeams(teams: Teams): Promise<AckResponse> {
    return emitWithAck("room:setTeams", { teams });
  }

  function setHandicap(playerId: string, handicap: number) {
    socket.emit("room:setHandicap", { playerId, handicap });
  }

  function startGame(): Promise<AckResponse> {
    return emitWithAck("room:start", {});
  }

  function newRound() {
    socket.emit("room:newRound", {});
  }

  function leaveRoom() {
    socket.emit("room:leave", {});
    localStorage.removeItem(SESSION_KEY);
    setState(null);
    setPlayerId(null);
  }

  function setStrokes(holeNumber: number, targetName: string, strokes: number | null) {
    socket.emit("hole:setStrokes", { holeNumber, targetName, strokes });
  }

  function toggleBucket(holeNumber: number, targetName: string) {
    socket.emit("hole:toggleBucket", { holeNumber, targetName });
  }

  function setPgeEnabled(holeNumber: number, enabled: boolean) {
    socket.emit("hole:setPgeEnabled", { holeNumber, enabled });
  }

  function togglePgeWinner(holeNumber: number, targetName: string) {
    socket.emit("hole:togglePgeWinner", { holeNumber, targetName });
  }

  function resolvePuttOff(winner: string) {
    socket.emit("puttoff:resolve", { winner });
  }

  function confirmFinishRound() {
    socket.emit("room:confirmFinish", {});
  }

  function endGame() {
    socket.emit("room:endGame", {});
  }

  function setCurrentStep(stepIndex: number) {
    socket.emit("hole:setCurrentStep", { stepIndex });
  }

  function predict(playerName: string) {
    socket.emit("spectator:predict", { playerName });
  }

  function sendReaction(emoji: string) {
    socket.emit("spectator:react", { emoji });
  }

  function dismissReaction(id: number) {
    setReactions((r) => r.filter((entry) => entry.id !== id));
  }

  const me = state?.players.find((p) => p.id === playerId) ?? null;
  const isHost = Boolean(state && playerId && state.hostId === playerId);
  const isSpectator = Boolean(state && playerId && state.spectators.some((s) => s.id === playerId));

  return (
    <RoomContext.Provider
      value={{
        state,
        playerId,
        isHost,
        isSpectator,
        me,
        connecting,
        createRoom,
        joinRoom,
        spectateRoom,
        selectAvatar,
        setConfig,
        setCourse,
        setGameMode,
        setTeams,
        setHandicap,
        startGame,
        newRound,
        leaveRoom,
        setStrokes,
        toggleBucket,
        setPgeEnabled,
        togglePgeWinner,
        resolvePuttOff,
        confirmFinishRound,
        endGame,
        setCurrentStep,
        predict,
        sendReaction,
        reactions,
        dismissReaction,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
