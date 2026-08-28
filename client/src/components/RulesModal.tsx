import { useState } from "react";
import type { GameMode } from "../types";

const MODE_LABELS: Record<GameMode, string> = {
  standard: "Buckets",
  highlow: "High Low",
  wolf: "🐺 Wolf",
  baseball: "⚾ Baseball",
};

const ALL_MODES: GameMode[] = ["standard", "highlow", "wolf", "baseball"];

/** Opens straight to whichever mode is passed in (the room's currently
 * selected game mode, when there is one) instead of dumping every mode's
 * rules on the reader at once — the tabs are still there to browse the
 * others, but the mode you're actually about to play is what's on screen
 * first. Home (no room yet) just defaults to Buckets. */
export function RulesModal({ onClose, initialMode = "standard" }: { onClose: () => void; initialMode?: GameMode }) {
  const [mode, setMode] = useState<GameMode>(initialMode);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-green-100 dark:border-green-900 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-xl font-extrabold text-green-700 dark:text-green-400">
            How to play {MODE_LABELS[mode]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-4 shrink-0 overflow-x-auto">
          {ALL_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                mode === m
                  ? "bg-green-600 text-white border-green-600"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
          <section className="space-y-1.5">
            <h3 className="font-bold text-neutral-900 dark:text-white">The basics</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>One round covers all 18 holes of whichever course the host picks.</li>
              <li>One person hosts each round and enters everyone's strokes as you play — ideally the host rotates each time you golf, so everyone gets a turn.</li>
              <li>Everyone else can watch the scorecard live on their own phone as the host updates it.</li>
              <li>Loser (or losers, if more than one player is tied for last) buys the beers.</li>
            </ul>
          </section>

          {mode === "standard" && (
            <>
              <section className="space-y-1.5">
                <h3 className="font-bold text-neutral-900 dark:text-white">Buckets scoring</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>2-4 players, free-for-all — no teams.</li>
                  <li>
                    <span className="font-semibold">Winning a hole</span> (lowest strokes) is worth{" "}
                    <span className="font-semibold">2 points</span>. If two or more players tie for the low score,
                    they split the points evenly.
                  </li>
                  <li>
                    <span className="font-semibold">Birdie</span> (1 under par) is worth{" "}
                    <span className="font-semibold">1 bonus point</span> to every player who gets one on that hole,
                    whether or not they won the hole outright.
                  </li>
                  <li>
                    <span className="font-semibold">Eagle</span> (2+ under par) is worth{" "}
                    <span className="font-semibold">2 bonus points</span>, same deal — every player who gets one, not
                    just the hole winner.
                  </li>
                  <li>
                    <span className="font-semibold">Bucket challenge</span> — worth 1 bonus point. The host picks
                    anything nearby to serve as the "bucket" (a real bucket, a divot, a sprinkler head, whatever's
                    around) and everyone chips or putts at it; winner gets the point.
                  </li>
                  <li>
                    <span className="font-semibold">PG&amp;E challenge</span> — worth 1 more bonus point, optional
                    per hole. The host invents whatever creative challenge they want on the spot — "putt to that
                    tree," "chip it and stay on the mat," anything goes.
                  </li>
                  <li>
                    <span className="font-semibold">Hole-in-one</span> wins the whole match on the spot — the host
                    just has to confirm it by moving on to the next hole (or finishing the round, if it's the last
                    one).
                  </li>
                  <li>Whoever has the most points after 18 holes wins. Tied? It's settled with a putt-off — closest to the hole wins.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-neutral-900 dark:text-white">Ideas for extra challenges</h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Since the bucket and PG&amp;E challenges are whatever the host dreams up, here are some ideas to
                  keep in your back pocket:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Longest drive off the tee</li>
                  <li>Closest to the pin</li>
                  <li>One-handed or opposite-handed swing for the hole</li>
                  <li>Blind putt — no peeking after you strike it</li>
                  <li>Putt using your driver instead of your putter</li>
                  <li>Whoever hit the worst last hole tees off first this time</li>
                  <li>Speed golf — first one to hole out wins, no waiting your turn</li>
                  <li>Chip it and it has to stay on the towel/mat you throw down</li>
                  <li>Call your shot before you hit it — bonus point if it lands where you called</li>
                </ul>
              </section>
            </>
          )}

          {mode === "highlow" && (
            <section className="space-y-1.5">
              <h3 className="font-bold text-neutral-900 dark:text-white">High Low scoring (team mode)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  4 players only, split into two fixed 2-person teams for the whole round. No buckets or PG&amp;E in
                  this mode — it's just the match play score.
                </li>
                <li>
                  Each hole, your team's <span className="font-semibold">low scorer</span> plays the other team's low
                  scorer for 1 point, and your <span className="font-semibold">high scorer</span> plays their high
                  scorer for the other point.
                </li>
                <li>
                  A tie on either of those matchups is "no blood" — nobody gets that point. So a hole can be worth 0,
                  1, or 2 total points depending on how many matchups have a clear winner.
                </li>
                <li>
                  <span className="font-semibold">Handicaps</span> are optional — the host sets one for each player
                  before starting. Low/high is decided by <span className="font-semibold">net</span> score (after
                  handicap strokes), so a worse gross score can still end up as your team's "low" once a stroke is
                  applied. All four net scores are worked out first, then sorted into low/high — nobody's role is
                  locked in before the strokes are applied.
                </li>
                <li>
                  <span className="font-semibold">Birdie</span> is worth a{" "}
                  <span className="font-semibold">0.5 bonus point</span> and{" "}
                  <span className="font-semibold">eagle</span> a <span className="font-semibold">1 bonus point</span>{" "}
                  to your team, whether or not you won your matchup that hole — always based on your{" "}
                  <span className="font-semibold">gross</span> score, so a net birdie from a handicap stroke doesn't
                  count.
                </li>
                <li>
                  Front 9, back 9, and the overall 18 are three separate matches — a team can win the front and lose
                  the back, for instance. Whoever loses the overall match buys the beers; a tied overall match means
                  nobody has to.
                </li>
              </ul>
            </section>
          )}

          {mode === "wolf" && (
            <section className="space-y-1.5">
              <h3 className="font-bold text-neutral-900 dark:text-white">🐺 Wolf scoring</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  4 players only. There are no fixed teams — instead, the{" "}
                  <span className="font-semibold">wolf</span> rotates every hole: assigned randomly on the first
                  hole, then in order after that. No buckets or PG&amp;E in this mode.
                </li>
                <li>
                  The wolf hits last, then decides whether to{" "}
                  <span className="font-semibold">partner up</span> with one other player for the hole, or{" "}
                  <span className="font-semibold">go alone</span> against the other three.
                </li>
                <li>
                  <span className="font-semibold">Gross</span> strokes only — no handicap in this mode. Whichever
                  side has the better best-ball score wins the hole; a tie is "no blood," worth nothing.
                </li>
                <li>
                  A <span className="font-semibold">2v2 win</span> pays 1 point to each player on the winning side. A{" "}
                  <span className="font-semibold">lone wolf win</span> pays the wolf 3 points. A{" "}
                  <span className="font-semibold">lone wolf loss</span> pays 1 point to each of the three opponents.
                </li>
                <li>
                  <span className="font-semibold">Birdie</span> doubles and{" "}
                  <span className="font-semibold">eagle</span> triples whatever points the WINNING side earned on
                  the hole — shared by the whole side, not just whoever made it (so if you partner up and your
                  partner cards the birdie, you both get the doubled points). It only multiplies points actually
                  won, so a birdie on a lost hole is still worth 0.
                </li>
                <li>Most points after 18 holes wins, same as Buckets — ties go to a putt-off.</li>
              </ul>
            </section>
          )}

          {mode === "baseball" && (
            <section className="space-y-1.5">
              <h3 className="font-bold text-neutral-900 dark:text-white">⚾ Baseball scoring</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Exactly 3 players. No buckets or PG&amp;E, no teams — every hole is a flat-out race between the
                  three of you, decided by gross strokes.
                </li>
                <li>
                  Each hole is worth a flat <span className="font-semibold">9 points</span>, split by finish:{" "}
                  <span className="font-semibold">5</span> for 1st, <span className="font-semibold">3</span> for
                  2nd, <span className="font-semibold">1</span> for 3rd.
                </li>
                <li>
                  Ties pool the points for whichever places they cover and split them evenly. Two players tied for
                  1st share the 5+3=8 point pool for 1st and 2nd (4 each), leaving the solo 3rd place the last point.
                  One clear winner with the other two tied for 2nd/3rd means the winner takes their 5, and the tied
                  pair split the remaining 3+1=4 (2 each). All three tied splits the whole 9-point pot three ways (3
                  each).
                </li>
                <li>Most points after 18 holes wins, same as Buckets — ties go to a putt-off.</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
