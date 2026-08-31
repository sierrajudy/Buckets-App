import { useEffect, useMemo, useState } from "react";
import { useRoom } from "../store";
import { AvatarIcon } from "./Avatars";
import { EmojiReactionBar } from "./EmojiReactionBar";
import { QuickAddFriendButton } from "./QuickAddFriendButton";
import { joinNames } from "../lib/format";
import { deleteRound } from "../lib/api";
import { fetchFriendsOverview } from "../lib/friendsApi";
import { WolfBackdrop } from "./WolfBackdrop";
import { HighLowBackdrop } from "./HighLowBackdrop";
import { BaseballBackdrop } from "./BaseballBackdrop";
import { BucketsBackdrop } from "./BucketsBackdrop";

const CONFETTI_COLORS = ["#facc15", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
  size: number;
}

function useConfetti(count = 140): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 200,
        color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [count],
  );
}

export function Celebration({
  onViewStandings,
  onViewProfile,
  onViewAchievements,
}: {
  onViewStandings: () => void;
  onViewProfile: () => void;
  /** Takes them straight to Profile's Avatar & Achievements tab — used by
   * the achievement-unlock popup's "Equip now" button. Distinct from
   * onViewProfile, which is the plain 👤 Profile link and always opens on
   * the Rounds tab. */
  onViewAchievements: () => void;
}) {
  const { state, isHost, isSpectator, me, newRound, leaveRoom } = useRoom();
  const confetti = useConfetti();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [achievementPopupDismissed, setAchievementPopupDismissed] = useState(false);
  // Same idea as Lobby's quick-add — see relatedFriendNames there for why
  // this is a name set rather than looking anything up by id.
  const [relatedFriendNames, setRelatedFriendNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFriendsOverview()
      .then((ov) => setRelatedFriendNames(new Set(ov.friends.map((u) => u.name.toLowerCase()))))
      .catch(() => {});
  }, []);

  if (!state || !state.finishedRound) return null;
  const round = state.finishedRound;
  // Optional chaining on newAchievements itself, not just the lookup inside
  // it — a round finished before this feature existed has no such field at
  // all (undefined, not {}), and this screen can still show that old
  // finishedRound (a host who never clicked "New round" leaves everyone
  // sitting on it indefinitely).
  const myNewAchievements = me ? (round.newAchievements?.[me.name] ?? []) : [];
  const showAchievementPopup = myNewAchievements.length > 0 && !achievementPopupDismissed;
  const isHighLow = round.gameMode === "highlow";
  const isWolf = round.gameMode === "wolf";
  const isBaseball = round.gameMode === "baseball";
  const isBuckets = round.gameMode === "standard";
  const cardBgCls = "bg-black/30 backdrop-blur-sm";

  const grossTotals: Record<string, number> = {};
  const netTotals: Record<string, number> = {};
  for (const p of round.players) {
    grossTotals[p] = 0;
    netTotals[p] = 0;
  }
  for (const h of round.holes) {
    for (const p of round.players) {
      grossTotals[p] += h.strokes[p] ?? 0;
      netTotals[p] += h.highLow?.netStrokes[p] ?? h.strokes[p] ?? 0;
    }
  }

  async function handleDeleteRound() {
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteRound(round.id);
    setDeleting(false);
    if (res.ok) {
      setDeleted(true);
      setShowDeleteConfirm(false);
    } else {
      setDeleteError(res.error);
    }
  }

  function avatarFor(name: string) {
    return state!.players.find((p) => p.name === name)?.avatar ?? null;
  }

  function costumeFor(name: string) {
    return state!.players.find((p) => p.name === name)?.equippedCostume ?? null;
  }

  function isGuest(name: string) {
    return state!.players.find((p) => p.name === name)?.isGuest ?? false;
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex items-center justify-center p-4 pb-36 sm:pb-52 ${
        isHighLow
          ? "bg-gradient-to-b from-sky-400 via-amber-200 to-orange-400"
          : isWolf
            ? "bg-gradient-to-b from-slate-950 via-indigo-950 to-indigo-900"
            : isBaseball
              ? "bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900"
              : "bg-gradient-to-b from-slate-950 via-emerald-950 to-green-950"
      }`}
    >
      {isWolf && <WolfBackdrop />}
      {isHighLow && <HighLowBackdrop />}
      {isBaseball && <BaseballBackdrop />}
      {isBuckets && <BucketsBackdrop />}
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map((c) => (
          <div
            key={c.id}
            style={{
              left: `${c.left}%`,
              top: "-5vh",
              width: c.size,
              height: c.size * 0.4,
              backgroundColor: c.color,
              animation: `confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
              // @ts-expect-error custom property for the keyframe
              "--drift": `${c.drift}px`,
            }}
            className="absolute rounded-sm"
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={leaveRoom} className="text-neutral-500 hover:text-red-400">
            Home
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Reload if the game stops updating (e.g. after switching apps)"
              className="text-neutral-500 hover:text-white"
            >
              Refresh
            </button>
            <button type="button" onClick={onViewProfile} className="text-neutral-500 hover:text-white">
              👤 Profile
            </button>
          </div>
        </div>

        {round.holeInOnePlayer && (
          <div className="text-amber-400 font-bold text-sm tracking-widest uppercase">
            Match won on a hole in one!
          </div>
        )}
        {round.puttOff.used && (
          <div className="text-blue-400 font-bold text-sm tracking-widest uppercase">Won in a putt-off</div>
        )}

        {round.gameMode === "highlow" && round.teams && round.highLow ? (
          <div>
            <div className="text-neutral-400 text-sm tracking-[0.3em] uppercase mb-2">High Low Match</div>
            <div
              className="text-3xl sm:text-4xl font-black text-yellow-300 mb-4"
              style={{ animation: "lights-glow 1.4s ease-in-out infinite, pop-in 0.6s ease-out" }}
            >
              {round.highLow.overall.winner !== null
                ? `${round.teams[round.highLow.overall.winner].join(" & ")} win!`
                : "It's a tie!"}
            </div>
            <div className="space-y-2">
              {(
                [
                  { label: "Front 9", match: round.highLow.front },
                  { label: "Back 9", match: round.highLow.back },
                  { label: "Overall", match: round.highLow.overall },
                ] as const
              ).map(({ label, match }) => (
                <div key={label} className={`${cardBgCls} border border-neutral-800 rounded-xl px-3 py-2.5 text-sm`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
                    <span className="font-mono font-bold text-white">
                      {match.points[0]} – {match.points[1]}
                    </span>
                  </div>
                  <div className="flex items-start justify-between mt-1 gap-2 text-xs">
                    <span className={match.winner === 0 ? "font-bold text-yellow-300" : "text-neutral-400"}>
                      {round.teams![0].join(" & ")}
                    </span>
                    <span className={`text-right ${match.winner === 1 ? "font-bold text-yellow-300" : "text-neutral-400"}`}>
                      {round.teams![1].join(" & ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 px-1">Scores</div>
              {round.teams.map((team, i) => (
                <div key={i} className={`${cardBgCls} border border-neutral-800 rounded-xl px-3 py-2.5 text-sm space-y-1.5`}>
                  {team.map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-neutral-300">
                        <AvatarIcon avatar={avatarFor(p)} className="w-5 h-5" costume={costumeFor(p)} />
                        {p}
                      </span>
                      <span className="font-mono">
                        <span className="text-white font-semibold">{grossTotals[p]}</span>
                        <span className="text-neutral-500"> gross</span>
                        <span className="mx-1.5 text-neutral-600">/</span>
                        <span className="text-white font-semibold">{netTotals[p]}</span>
                        <span className="text-neutral-500"> net</span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-neutral-400 text-sm tracking-[0.3em] uppercase mb-2">Champion</div>
            <div className="flex items-center justify-center mb-2">
              <AvatarIcon avatar={avatarFor(round.winner)} className="w-20 h-20" costume={costumeFor(round.winner)} />
            </div>
            <div
              className="text-5xl sm:text-6xl font-black text-yellow-300"
              style={{ animation: "lights-glow 1.4s ease-in-out infinite, pop-in 0.6s ease-out" }}
            >
              {round.winner}
            </div>
            <div className="mt-2 text-2xl font-bold text-green-400">{round.totals[round.winner]} pts</div>
          </div>
        )}

        {isHost && (
          <div className={`rounded-2xl border border-neutral-800 ${cardBgCls} p-3 text-center`}>
            {deleted ? (
              <p className="text-sm text-neutral-400">This round won't count in anyone's standings.</p>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm font-semibold text-neutral-300 hover:text-red-400"
              >
                🚫 Don't count this game in the standings
              </button>
            )}
            {deleteError && <p className="text-xs text-red-400 mt-1">{deleteError}</p>}
          </div>
        )}

        <div className={`${cardBgCls} border border-neutral-800 rounded-2xl p-5`}>
          <div className="text-sm text-neutral-400 mb-3">Final scores</div>
          <div className="space-y-1.5">
            {[...round.players]
              .sort((a, b) => (round.totals[b] ?? 0) - (round.totals[a] ?? 0))
              .map((p) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <AvatarIcon avatar={avatarFor(p)} className="w-6 h-6 shrink-0" costume={costumeFor(p)} />
                    <span className={round.winners.includes(p) ? "text-yellow-300 font-semibold" : "text-neutral-300"}>
                      {p}
                    </span>
                    {p !== me?.name && !isGuest(p) && !relatedFriendNames.has(p.toLowerCase()) && (
                      <QuickAddFriendButton
                        name={p}
                        dark
                        onSent={() => setRelatedFriendNames((prev) => new Set(prev).add(p.toLowerCase()))}
                      />
                    )}
                  </span>
                  <span className="font-mono text-neutral-300 shrink-0">{round.totals[p]}</span>
                </div>
              ))}
          </div>
        </div>

        {round.losers.length > 0 && (
          <div
            className="rounded-2xl p-5 bg-amber-950/40 border border-amber-800"
            style={{ animation: "pop-in 0.6s ease-out 0.3s both" }}
          >
            <div className="text-2xl mb-1">🍺</div>
            <div className="text-amber-200 font-semibold">
              {joinNames(round.losers)} {round.losers.length > 1 ? "are" : "is"} buying the beers
            </div>
          </div>
        )}

        <div className={`rounded-2xl p-4 ${cardBgCls} border border-neutral-800 text-center space-y-3`}>
          <p className="text-sm text-neutral-300">
            Enjoying Buckets? Venmo{" "}
            <a
              href="https://venmo.com/u/Sierra-Judy-2"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 hover:text-green-400"
            >
              @Sierra-judy-2
            </a>
          </p>
          <a
            href="https://forms.gle/Ak7XVKw863xM1B8L8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 px-4 py-2 text-sm font-semibold"
          >
            Send Feedback
          </a>
        </div>

        <button
          type="button"
          onClick={onViewProfile}
          className={`w-full rounded-2xl p-4 ${cardBgCls} border border-neutral-800 text-center hover:border-neutral-700`}
        >
          <div className="text-sm font-semibold text-white">📧 Want an email when the next round starts?</div>
          <div className="text-xs text-neutral-400 mt-1">Tap to manage your notification settings</div>
        </button>

        {isSpectator && <EmojiReactionBar dark />}

        <div className="flex gap-2">
          <button
            onClick={onViewStandings}
            className="flex-1 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 py-2.5 font-semibold text-sm"
          >
            View standings
          </button>
          {isHost ? (
            <button
              onClick={newRound}
              className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 font-semibold text-sm"
            >
              New round
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
              Waiting for host to start a new round…
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-white">Don't count this game in the standings?</p>
            <p className="text-sm text-neutral-400">
              This removes it from everyone's history and the standings — not just yours. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteRound}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5"
              >
                {deleting ? "Removing…" : "Yes, don't count it"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 disabled:opacity-60 font-semibold py-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAchievementPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm bg-neutral-900 border border-amber-500/40 rounded-2xl shadow-lg p-6 space-y-5 text-center"
            style={{ animation: "pop-in 0.4s ease-out" }}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                {myNewAchievements.length > 1 ? "Achievements unlocked!" : "Achievement unlocked!"}
              </div>
              <p className="text-sm text-neutral-400">
                You unlocked a new costume piece{myNewAchievements.length > 1 ? " for each of these" : ""} — head to
                your Closet to equip it.
              </p>
            </div>

            <div className="space-y-2">
              {myNewAchievements.map((a) => (
                <div
                  key={a.key}
                  className="flex items-center gap-3 bg-neutral-800/80 border border-amber-500/30 rounded-xl p-3 text-left"
                >
                  <div
                    className="w-11 h-11 shrink-0 rounded-full bg-neutral-900 flex items-center justify-center text-2xl"
                    style={{ animation: "badge-pop 0.5s ease-out" }}
                  >
                    {a.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm">{a.title}</div>
                    <div className="text-xs text-neutral-400">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAchievementPopupDismissed(true);
                  onViewAchievements();
                }}
                className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold py-2.5"
              >
                Equip now
              </button>
              <button
                type="button"
                onClick={() => setAchievementPopupDismissed(true)}
                className="flex-1 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 font-semibold py-2.5"
              >
                Yay! 🎉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
