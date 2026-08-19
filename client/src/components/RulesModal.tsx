export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-green-100 dark:border-green-900 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-xl font-extrabold text-green-700 dark:text-green-400">How to play Buckets</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
          <section className="space-y-1.5">
            <h3 className="font-bold text-neutral-900 dark:text-white">The basics</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>2-4 players, one round covering all 18 holes of whichever course the host picks.</li>
              <li>One person hosts each round and enters everyone's strokes as you play — ideally the host rotates each time you golf, so everyone gets a turn.</li>
              <li>Everyone else can watch the scorecard live on their own phone as the host updates it.</li>
              <li>Whoever has the most points after 18 holes wins the match. If it's tied, it's settled with a putt-off — closest to the hole wins.</li>
              <li>Loser (or losers, if more than one player is tied for last) buys the beers.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-neutral-900 dark:text-white">Scoring</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-semibold">Winning a hole</span> (lowest strokes) is worth{" "}
                <span className="font-semibold">2 points</span>. If two or more players tie for the low score, they
                split the points evenly.
              </li>
              <li>
                <span className="font-semibold">Birdie</span> (1 under par) doubles the hole to{" "}
                <span className="font-semibold">4 points</span>.
              </li>
              <li>
                <span className="font-semibold">Eagle</span> (2+ under par) triples the hole to{" "}
                <span className="font-semibold">6 points</span>.
              </li>
              <li>
                <span className="font-semibold">Bucket challenge</span> — worth 1 bonus point. The host picks
                anything nearby to serve as the "bucket" (a real bucket, a divot, a sprinkler head, whatever's
                around) and everyone chips or putts at it; winner gets the point.
              </li>
              <li>
                <span className="font-semibold">PG&amp;E challenge</span> — worth 1 more bonus point, optional per
                hole. The host invents whatever creative challenge they want on the spot — "putt to that tree,"
                "chip it and stay on the mat," anything goes.
              </li>
              <li>
                <span className="font-semibold">Hole-in-one</span> wins the whole match on the spot — the host just
                has to confirm it by moving on to the next hole (or finishing the round, if it's the last one).
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-bold text-neutral-900 dark:text-white">Ideas for extra challenges</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Since the bucket and PG&amp;E challenges are whatever the host dreams up, here are some ideas to keep
              in your back pocket:
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
        </div>
      </div>
    </div>
  );
}
