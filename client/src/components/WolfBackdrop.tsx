/** Wolf mode's night-sky ambiance: a twinkling starfield, a north star, a
 * full moon, and a big pine tree-line — all pinned to the browser viewport
 * (position: fixed) rather than the page, so the whole scene stays frozen
 * in place at the same spot on screen as the page scrolls past underneath
 * it (the moon starts out above the room code / first card, then real
 * content scrolls up over it, same as everything else here). Callers pair
 * this with a dark night-sky gradient on their own root element (see Lobby
 * / Scorecard) and add a little extra bottom padding of their own so the
 * tree-line never fights for legibility with real controls (like a "Start
 * round" button) near the bottom of the page. */
import { ForestTreeLine } from "./ForestTrees";

/** Deterministic pseudo-random generator (mulberry32) so the star field is
 * stable across renders/reloads instead of reshuffling every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  xPct: number;
  yPct: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
}

/** Positioned by percentage (not an SVG viewBox), and sized as a fixed
 * pixel diameter — that combination is what keeps every star a true circle
 * regardless of the screen's aspect ratio. A stretched viewBox (the earlier
 * approach) turns circles into ovals on anything that isn't the exact
 * viewBox aspect, which is exactly what this avoids. */
const STARS: Star[] = (() => {
  const rand = mulberry32(1337);
  const stars: Star[] = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      xPct: rand() * 100,
      yPct: rand() * 85,
      size: 2 + rand() * 3,
      dur: 2 + rand() * 3,
      delay: rand() * 4,
      dx: (rand() - 0.5) * 8,
      dy: (rand() - 0.5) * 8,
    });
  }
  return stars;
})();

function TwinkleStar({ xPct, yPct, size, dur, delay, dx, dy }: Star, key: number) {
  return (
    <div
      key={key}
      className="absolute rounded-full bg-white"
      style={
        {
          left: `${xPct}%`,
          top: `${yPct}%`,
          width: size,
          height: size,
          animation: `star-twinkle ${dur}s ease-in-out ${delay}s infinite`,
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
        } as React.CSSProperties
      }
    />
  );
}

/** A bigger, brighter sparkle-shaped star (the classic four-pointed
 * "north star" mark) with its own soft glow, standing out from the plain
 * twinkling dots around it. A small, unstretched SVG (viewBox matches its
 * own square size) so the sparkle shape stays true regardless of the
 * screen's aspect ratio. */
function NorthStar({ xPct, yPct, size }: { xPct: number; yPct: number; size: number }) {
  const long = 10;
  const short = long * 0.28;
  const c = 12;
  const points = [
    [c, c - long],
    [c + short, c - short],
    [c + long, c],
    [c + short, c + short],
    [c, c + long],
    [c - short, c + short],
    [c - long, c],
    [c - short, c - short],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
  return (
    <div className="absolute" style={{ left: `${xPct}%`, top: `${yPct}%`, width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full bg-white/25"
        style={{ transform: "scale(2.2)" }}
      />
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        style={{ animation: "north-star-pulse 3.4s ease-in-out infinite" }}
      >
        <polygon points={points} className="fill-amber-50" />
      </svg>
    </div>
  );
}

export function WolfBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0">
        {STARS.map((s, i) => TwinkleStar(s, i))}
        <NorthStar xPct={10} yPct={38} size={26} />
      </div>

      <div className="absolute top-10 right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-amber-50 shadow-[0_0_70px_22px_rgba(252,211,77,0.35)]" />

      <ForestTreeLine className="absolute inset-x-0 bottom-0 w-full h-32 sm:h-44" />
    </div>
  );
}
