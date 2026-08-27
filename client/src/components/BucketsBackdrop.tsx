/** Buckets mode's own theme: a driving range at night under floodlights —
 * a rolling fairway silhouette, a couple of tall light towers glowing
 * overhead, and the app's own bucket-of-balls sitting out front with a few
 * loose balls scattered on the grass. Everything here is pinned to the
 * browser viewport (position: fixed) rather than the page, so the whole
 * scene stays frozen in place at the same spot on screen as the page
 * scrolls past underneath it. Callers pair this with a dark green-night
 * gradient on their own root element (see Lobby / Scorecard) and add a
 * little extra bottom padding of their own so the fairway never fights for
 * legibility with real controls near the bottom of the page. */

interface Mound {
  x: number;
  h: number;
  w: number;
}

/** One continuous rolling-fairway silhouette rather than separate hills, so
 * it reads as a single stretch of grass instead of a row of bumps. */
function fairway(mounds: Mound[]): string {
  const top = mounds.map(({ x, h }) => `${x},${90 - h}`).join(" ");
  return `-10,90 ${top} 410,90`;
}

const BACK_FAIRWAY: Mound[] = [
  { x: -10, h: 14 },
  { x: 60, h: 20 },
  { x: 140, h: 12 },
  { x: 220, h: 22 },
  { x: 300, h: 14 },
  { x: 410, h: 18 },
];

const FRONT_FAIRWAY: Mound[] = [
  { x: -10, h: 10 },
  { x: 90, h: 26 },
  { x: 180, h: 8 },
  { x: 260, h: 24 },
  { x: 340, h: 12 },
  { x: 410, h: 16 },
];

const LOOSE_BALLS = [
  { x: 12, y: 78, r: 2.4 },
  { x: 22, y: 84, r: 2 },
  { x: 300, y: 80, r: 2.2 },
  { x: 320, y: 86, r: 1.8 },
  { x: 340, y: 76, r: 2.4 },
  { x: 370, y: 83, r: 2 },
];

function FloodLight({ leftPct }: { leftPct: number }) {
  return (
    <div className="absolute bottom-0" style={{ left: `${leftPct}%` }}>
      <div className="w-[3px] h-28 sm:h-40 bg-neutral-700/70 mx-auto" />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 shadow-[0_0_70px_24px_rgba(253,224,71,0.4)]" />
    </div>
  );
}

/** The app's own galvanized-pail bucket, overflowing with a mound of golf
 * balls — same silhouette style as the Splash screen / DrivingRange bucket
 * markers, just the centerpiece here instead of a small marker. */
function BucketOfBalls() {
  return (
    <svg viewBox="0 0 120 100" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 sm:w-32" style={{ height: "auto" }}>
      <path
        d="M18 30 Q60 20 102 30 L95 92 Q60 100 25 92 Z"
        className="fill-neutral-800"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M17 52 L103 52 L101 58 L19 58 Z" className="fill-neutral-700" opacity="0.7" />
      <path d="M21 74 L99 74 L97.5 79 L22.5 79 Z" className="fill-neutral-700" opacity="0.7" />
      {[
        [40, 20],
        [58, 12],
        [76, 20],
        [50, 22],
        [68, 24],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" className="fill-white" stroke="#0f172a" strokeWidth="2" />
      ))}
      <ellipse cx="60" cy="30" rx="42" ry="8" className="fill-neutral-600" stroke="#0f172a" strokeWidth="3" />
    </svg>
  );
}

export function BucketsBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <FloodLight leftPct={12} />
      <FloodLight leftPct={82} />

      <svg
        viewBox="0 0 400 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-32 sm:h-44"
      >
        <polygon points={fairway(BACK_FAIRWAY)} className="fill-green-950/60" />
        <polygon points={fairway(FRONT_FAIRWAY)} className="fill-green-950 opacity-90" />
        {LOOSE_BALLS.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} className="fill-white/80" />
        ))}
      </svg>

      <div className="absolute bottom-0 sm:bottom-2 inset-x-0 h-24 sm:h-32">
        <BucketOfBalls />
      </div>
    </div>
  );
}
