/** A calm daytime fairway scene behind the login/signup card — a warm sun
 * glow, a couple of slow-drifting clouds, two rolling grass hills, and a
 * single flagstick. Pinned to the browser viewport (position: fixed) like
 * the game's other mode backdrops (see BucketsBackdrop / HighLowBackdrop)
 * rather than the page, and kept low-contrast so it reads as ambiance
 * behind the opaque white card instead of competing with the form. Callers
 * need `relative z-10` on their real content — a fixed element paints above
 * plain in-flow content regardless of DOM order, same as those other
 * backdrops require. */

interface Mound {
  x: number;
  h: number;
}

function fairway(mounds: Mound[]): string {
  const top = mounds.map(({ x, h }) => `${x},${90 - h}`).join(" ");
  return `-10,90 ${top} 410,90`;
}

const BACK_FAIRWAY: Mound[] = [
  { x: -10, h: 10 },
  { x: 80, h: 16 },
  { x: 160, h: 8 },
  { x: 240, h: 18 },
  { x: 320, h: 10 },
  { x: 410, h: 14 },
];

const FRONT_FAIRWAY: Mound[] = [
  { x: -10, h: 6 },
  { x: 70, h: 20 },
  { x: 150, h: 5 },
  { x: 230, h: 18 },
  { x: 310, h: 8 },
  { x: 410, h: 12 },
];

const CLOUDS = [
  { top: 10, size: 50, dur: 65, delay: 0 },
  { top: 18, size: 34, dur: 80, delay: -30 },
];

export function AuthBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-warning-100 to-warning-300 dark:from-warning-900/40 dark:to-warning-800/20 shadow-[0_0_90px_30px_rgba(250,204,21,0.25)] dark:shadow-[0_0_90px_30px_rgba(250,204,21,0.08)]" />

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/70 dark:bg-white/10"
          style={{
            top: `${c.top}%`,
            left: "-20%",
            width: c.size,
            height: c.size * 0.4,
            animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-40 sm:h-56">
        <polygon points={fairway(BACK_FAIRWAY)} className="fill-primary-200/70 dark:fill-primary-900/40" />
        <polygon points={fairway(FRONT_FAIRWAY)} className="fill-primary-300/70 dark:fill-primary-950/60" />
      </svg>

      <svg
        viewBox="0 0 24 24"
        className="absolute bottom-20 sm:bottom-28 left-[15%] w-6 h-6 sm:w-8 sm:h-8"
        style={{ transformOrigin: "4px 22px" }}
      >
        <line x1="4" y1="2" x2="4" y2="22" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M4 3 L19 7 L4 11 Z"
          fill="#ef4444"
          stroke="#0f172a"
          strokeWidth="1"
          style={{ animation: "flag-flutter 1.8s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}
