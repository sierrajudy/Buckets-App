import { useEffect, useState } from "react";
import { Eye, QrCode, User } from "lucide-react";
import { useRoom } from "../store";
import { AVATAR_KEYS, AVATAR_META, AvatarIcon, type AvatarKey } from "./Avatars";
import { RulesModal } from "./RulesModal";
import { CourseSearch } from "./CourseSearch";
import { TeamPicker } from "./TeamPicker";
import { WolfBackdrop } from "./WolfBackdrop";
import { HighLowBackdrop } from "./HighLowBackdrop";
import { BucketsBackdrop } from "./BucketsBackdrop";
import { BaseballBackdrop } from "./BaseballBackdrop";
import { QuickAddFriendButton } from "./QuickAddFriendButton";
import { WeatherChip } from "./WeatherChip";
import { AddFriendToRoundButton } from "./AddFriendToRoundButton";
import { RoomQrModal } from "./RoomQrModal";
import { fetchFriendsOverview } from "../lib/friendsApi";
import type { GameMode } from "../types";

const GAME_MODES: { key: GameMode; label: string; blurb: string }[] = [
  { key: "standard", label: "Buckets", blurb: "2-4 players, free-for-all points" },
  { key: "highlow", label: "High Low", blurb: "4 players, 2v2 team match play" },
  { key: "wolf", label: "🐺 Wolf", blurb: "4 players, a rotating wolf, beware!" },
  { key: "baseball", label: "⚾ Baseball", blurb: "3 players, 5-3-1 points per hole" },
];

export function Lobby({
  onViewStandings,
  onViewProfile,
}: {
  onViewStandings: () => void;
  onViewProfile: () => void;
}) {
  const {
    state,
    isHost,
    isSpectator,
    me,
    selectAvatar,
    setConfig,
    setCourse,
    setGameMode,
    setTeams,
    setHandicap,
    startGame,
    leaveRoom,
    addGuest,
  } = useRoom();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  // Names already covered by a friend relationship (mutual, or a pending
  // request in either direction) — the quick-add button next to a player's
  // name only shows for names NOT in this set, so it disappears the moment
  // it's no longer needed instead of just failing silently on click.
  const [relatedFriendNames, setRelatedFriendNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFriendsOverview()
      .then((ov) => setRelatedFriendNames(new Set(ov.friends.map((u) => u.name.toLowerCase()))))
      .catch(() => {});
  }, []);

  const isHighLow = state?.gameMode === "highlow";
  const isWolf = state?.gameMode === "wolf";
  const isBuckets = state?.gameMode === "standard";
  const isBaseball = state?.gameMode === "baseball";
  // How many players this mode needs exactly before it can start — null
  // for Buckets, which just needs 2-4 and has no single magic number.
  const requiredPlayers = isHighLow || isWolf ? 4 : isBaseball ? 3 : null;
  const requiredPlayersLabel = isHighLow ? "High Low" : isWolf ? "Wolf" : "Baseball";
  const highLowReady = isHighLow && state?.players.length === 4;
  // Every mode now has its own fixed background scene, so cards go
  // translucent everywhere to let it show through — a dark glass tint (not
  // a light one) keeps white title text legible no matter what's behind
  // it, including High Low's sky swinging from bright blue to dark
  // mountain silhouette.
  const cardBgCls = "bg-black/30 backdrop-blur-sm";
  const labelCls = "text-white";

  // High Low always needs a valid 2v2 split to start. Rather than make the
  // host explicitly assign teams before they can do anything else, seed a
  // default pairing (join order) the moment 4 players are in — the host
  // can still rearrange it with TeamPicker afterward.
  useEffect(() => {
    if (!isHost || !state || !highLowReady || state.teams) return;
    const names = state.players.map((p) => p.name);
    setTeams([
      [names[0], names[1]],
      [names[2], names[3]],
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, highLowReady, state?.teams, state?.players.map((p) => p.name).join(",")]);

  if (!state) return null;

  const takenAvatars = new Set(state.players.filter((p) => p.avatar).map((p) => p.avatar));
  const canStart =
    Boolean(state.courseId) &&
    state.players.every((p) => p.avatar) &&
    (isHighLow
      ? state.players.length === 4 && state.teams !== null
      : requiredPlayers !== null
        ? state.players.length === requiredPlayers
        : state.players.length >= 2 && state.players.length <= 4);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const res = await startGame();
    setStarting(false);
    if (!res.ok) setStartError(res.error ?? "Couldn't start the round.");
  }

  async function copyCode() {
    try {
      const link = `${window.location.origin}/?code=${state!.code}`;
      await navigator.clipboard.writeText(`Join my Buckets round! Code: ${state!.code}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the code is already on screen to read off
    }
  }

  return (
    <div
      className={`min-h-screen px-4 pb-36 sm:pb-52 pt-[calc(env(safe-area-inset-top)+1rem)] relative ${
        isHighLow
          ? "bg-gradient-to-b from-sky-400 via-amber-200 to-orange-400"
          : isWolf
            ? "bg-gradient-to-b from-slate-950 via-indigo-950 to-indigo-900"
            : isBaseball
              ? "bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900"
              : "bg-gradient-to-b from-slate-950 via-emerald-950 to-primary-950"
      }`}
    >
      {isWolf && <WolfBackdrop />}
      {isHighLow && <HighLowBackdrop />}
      {isBuckets && <BucketsBackdrop />}
      {isBaseball && <BaseballBackdrop />}
      <div className="max-w-lg mx-auto space-y-4 relative z-10">
        {/* Extra vertical padding (beyond what the text itself needs) widens
         * the tap target on every one of these — plain small text links,
         * sitting right at the top of the screen, were hard to hit
         * precisely on a phone. */}
        <div className="flex items-center justify-between -mx-1">
          <button onClick={leaveRoom} className="text-sm text-neutral-500 hover:text-danger-500 py-2.5 px-1">
            Leave
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              title="Reload if the room stops updating (e.g. after switching apps)"
              className="text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 py-2.5 px-1"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 py-2.5 px-1"
            >
              Rules
            </button>
            <button
              onClick={onViewProfile}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 py-2.5 px-1"
            >
              <User size={14} aria-hidden /> Profile
            </button>
            <button
              onClick={onViewStandings}
              className="text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 py-2.5 px-1"
            >
              Standings
            </button>
          </div>
        </div>

        <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-center`}>
          <div className={`text-xs font-semibold ${labelCls} uppercase tracking-widest mb-1`}>Room code</div>
          <button
            onClick={copyCode}
            className="text-4xl font-black tracking-[0.25em] text-primary-700 dark:text-primary-400 font-mono"
          >
            {state.code}
          </button>
          <div className="text-xs text-neutral-400 mt-1">{copied ? "Copied!" : "Tap to copy · share with your group"}</div>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <QrCode size={14} aria-hidden /> Show QR code
          </button>
          <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mt-2">
            <Eye size={14} aria-hidden /> {state.spectators.length} {state.spectators.length === 1 ? "person" : "people"} watching
          </div>
        </div>

        {isSpectator && (
          <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-center text-sm text-neutral-500 dark:text-neutral-400`}>
            You're spectating — sit back and watch, no avatar needed. Waiting for the host to start the round…
          </div>
        )}

        <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4`}>
          <div className={`text-sm font-semibold ${labelCls} mb-3`}>Game mode</div>
          {isHost ? (
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setGameMode(mode.key)}
                  className={`text-left rounded-xl border-2 p-3 transition-colors ${
                    state.gameMode === mode.key
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                      : "border-transparent bg-neutral-50 dark:bg-neutral-800 hover:border-primary-300"
                  }`}
                >
                  <div className="font-semibold text-sm">{mode.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{mode.blurb}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="font-semibold text-white">{GAME_MODES.find((m) => m.key === state.gameMode)?.label}</div>
          )}
        </div>

        {isHighLow && (
          <TeamPicker
            state={state}
            isHost={isHost}
            onSetTeams={(teams) => setTeams(teams)}
            onSetHandicap={(playerId, handicap) => setHandicap(playerId, handicap)}
          />
        )}

        <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4`}>
          <div className={`text-sm font-semibold ${labelCls} mb-1`}>Course</div>

          {isHost ? (
            <CourseSearch
              onSelect={(course) => setCourse(course.id)}
              confirmedCourseName={state.course}
              confirmedCourseStats={state.courseStats}
            />
          ) : (
            <>
              {state.course ? (
                <div className="font-semibold text-white">{state.course}</div>
              ) : (
                <div className="font-semibold italic text-neutral-400">Host hasn't picked a course yet</div>
              )}
              {state.courseStats && (
                <div className="text-xs text-neutral-500 mt-0.5">
                  {state.courseStats.teeLabel} tees · {state.courseStats.totalYards} yds · Rating{" "}
                  {state.courseStats.courseRating.toFixed(1)} · Slope {state.courseStats.slopeRating}
                </div>
              )}
            </>
          )}

          <WeatherChip location={state.courseStats?.location ?? null} />

          {state.courseId &&
            (isHost ? (
              <div className="mt-3">
                <label className="block text-sm font-medium text-white mb-1">Starting hole</label>
                <select
                  value={state.startingHole}
                  onChange={(e) => setConfig(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/40 bg-transparent text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Array.from({ length: state.results.length }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h} className="text-black">
                      Hole {h}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-sm text-white/70 mt-1">Starting hole {state.startingHole}</div>
            ))}
        </div>

        <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4`}>
          <div className={`text-sm font-semibold ${labelCls} mb-3`}>
            Players ({state.players.length}/{requiredPlayers ?? 4})
          </div>
          <div className="space-y-2">
            {state.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="avatar-idle" style={{ animationDelay: `${i * 0.35}s` }}>
                  <AvatarIcon avatar={p.avatar} className="w-10 h-10 shrink-0" costume={p.equippedCostume} />
                </span>
                <span className={`font-medium ${labelCls}`}>{p.name}</span>
                {p.id === state.hostId && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
                {p.id === me?.id && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
                {p.isGuest && (
                  <span
                    title="No account — added by the host, nothing saved to a personal history afterward"
                    className="text-[10px] font-bold uppercase tracking-wide bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded"
                  >
                    Guest
                  </span>
                )}
                {!p.isGuest && p.id !== me?.id && !relatedFriendNames.has(p.name.toLowerCase()) && (
                  <QuickAddFriendButton
                    name={p.name}
                    dark
                    onSent={() =>
                      setRelatedFriendNames((prev) => new Set(prev).add(p.name.toLowerCase()))
                    }
                  />
                )}
                {!p.connected && <span className="text-[10px] text-neutral-400 ml-auto">reconnecting…</span>}
              </div>
            ))}
          </div>

          {(!isSpectator || (isHost && state.players.length < 4)) && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                {isHost && state.players.length < 4 && !showAddGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddGuest(true);
                      setGuestError(null);
                    }}
                    className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-2"
                  >
                    + Add a guest
                  </button>
                )}
                {!isSpectator && <AddFriendToRoundButton dark />}
              </div>

              {isHost && state.players.length < 4 && showAddGuest && (
                <div className="space-y-2">
                  <p className="text-xs text-white/60">
                    A guest plays and gets scored like anyone else, but doesn't need a Buckets account — no login, no
                    email, and there's no personal history for it to be saved to afterward.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Guest's name"
                      maxLength={20}
                      autoFocus
                      className="flex-1 rounded-lg border border-white/40 bg-transparent text-white placeholder:text-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      disabled={addingGuest || !guestName.trim()}
                      onClick={async () => {
                        setAddingGuest(true);
                        setGuestError(null);
                        const res = await addGuest(guestName.trim());
                        setAddingGuest(false);
                        if (res.ok) {
                          setGuestName("");
                          setShowAddGuest(false);
                        } else {
                          setGuestError(res.error);
                        }
                      }}
                      className="shrink-0 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold"
                    >
                      {addingGuest ? "Adding…" : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddGuest(false);
                        setGuestName("");
                        setGuestError(null);
                      }}
                      className="shrink-0 rounded-lg border border-white/30 text-white/70 hover:text-white px-3 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {guestError && <p className="text-xs text-danger-400">{guestError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {!isSpectator && (
          <div className={`${cardBgCls} rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4`}>
            <div className={`text-sm font-semibold ${labelCls} mb-3`}>Pick your avatar</div>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_KEYS.map((key) => {
                const takenByOther = takenAvatars.has(key) && me?.avatar !== key;
                const selected = me?.avatar === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={takenByOther}
                    onClick={() => selectAvatar(key as AvatarKey)}
                    className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition-all ${
                      selected
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                        : takenByOther
                          ? "border-transparent opacity-30 cursor-not-allowed"
                          : "border-transparent hover:border-primary-300"
                    }`}
                  >
                    <AvatarIcon avatar={key as AvatarKey} className="w-12 h-12" />
                    <span className="text-[10px] font-medium text-white/70">
                      {AVATAR_META[key as AvatarKey].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {startError && <p className="text-sm text-danger-500 text-center">{startError}</p>}

        {!isSpectator &&
          (isHost ? (
            <div>
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-semibold py-3"
              >
                {starting ? "Starting…" : "Start round"}
              </button>
              {!state.courseId ? (
                <p className="text-center text-xs text-neutral-500 mt-2">Pick a course above to continue</p>
              ) : requiredPlayers !== null && state.players.length !== requiredPlayers ? (
                <p className="text-center text-xs text-neutral-500 mt-2">
                  {requiredPlayersLabel} needs exactly {requiredPlayers} players ({state.players.length}/{requiredPlayers}{" "}
                  so far)
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-center text-sm text-neutral-500 py-2">
              {!state.courseId
                ? "Waiting for the host to pick a course…"
                : requiredPlayers !== null && state.players.length !== requiredPlayers
                  ? `${requiredPlayersLabel} needs exactly ${requiredPlayers} players (${state.players.length}/${requiredPlayers} so far)`
                  : canStart
                    ? "Waiting for the host to start the round…"
                    : "Waiting for everyone to pick an avatar…"}
            </p>
          ))}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} initialMode={state?.gameMode ?? "standard"} />}
      {showQr && <RoomQrModal code={state.code} onClose={() => setShowQr(false)} />}
    </div>
  );
}
