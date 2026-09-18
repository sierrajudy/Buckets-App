/** High Low mode's sunset ambiance: a bright blue-to-gold sky, a couple of
 * slow-drifting clouds, a big warm sun, and a two-layer mountain range with
 * a golden-lit river at its feet — literally high peaks and a low valley,
 * for a mode that's all about who's high and who's low on a hole.
 * Everything here is pinned to the browser viewport (position: fixed)
 * rather than the page, so the whole scene stays frozen in place at the
 * same spot on screen as the page scrolls past underneath it (the sun
 * starts out above the room code / first card, then real content scrolls
 * up over it). Callers pair this with a bright sunset gradient on their own
 * root element (see Lobby / Scorecard) and add a little extra bottom
 * padding of their own so the mountains never fight for legibility with
 * real controls near the bottom of the page. */

import { ridgePolygon, type RidgePoint } from "./backdropShapes";

const BACK_RIDGE: RidgePoint[] = [
  { x: -10, h: 22 },
  { x: 30, h: 34 },
  { x: 70, h: 24 },
  { x: 110, h: 40 },
  { x: 150, h: 26 },
  { x: 195, h: 36 },
  { x: 240, h: 24 },
  { x: 280, h: 38 },
  { x: 320, h: 26 },
  { x: 360, h: 32 },
  { x: 410, h: 22 },
];

const FRONT_RIDGE: RidgePoint[] = [
  { x: -10, h: 36 },
  { x: 25, h: 60 },
  { x: 60, h: 40 },
  { x: 95, h: 72 },
  { x: 135, h: 44 },
  { x: 175, h: 68 },
  { x: 215, h: 42 },
  { x: 255, h: 76 },
  { x: 295, h: 46 },
  { x: 335, h: 64 },
  { x: 375, h: 40 },
  { x: 410, h: 54 },
];

/** Small white caps on the front ridge's tallest peaks only — the back
 * ridge is meant to read as hazy and distant, so it skips them. */
const SNOW_CAPS = FRONT_RIDGE.filter((p) => p.h >= 54);

function snowCap({ x, h }: RidgePoint, key: number) {
  const w = 9;
  return (
    <polygon
      key={key}
      points={`${x},${90 - h} ${x - w},${90 - h + w * 0.8} ${x + w},${90 - h + w * 0.8}`}
      className="fill-white/90"
    />
  );
}

const CLOUDS = [
  { top: 14, size: 60, dur: 55, delay: 0 },
  { top: 24, size: 42, dur: 70, delay: -20 },
  { top: 9, size: 34, dur: 62, delay: -40 },
];

export function HighLowBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/60"
          style={{
            top: `${c.top}%`,
            left: "-20%",
            width: c.size,
            height: c.size * 0.4,
            animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div className="absolute top-10 right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-yellow-100 to-orange-300 shadow-[0_0_90px_30px_rgba(251,146,60,0.5)]" />

      <svg
        viewBox="0 0 400 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-40 sm:h-56"
      >
        <polygon points={ridgePolygon(BACK_RIDGE)} className="fill-orange-900/40" />
        <polygon points={ridgePolygon(FRONT_RIDGE)} className="fill-stone-900 opacity-85" />
        {SNOW_CAPS.map(snowCap)}
        <path
          d="M -10 88 Q 60 84 120 88 T 240 87 T 360 89 T 410 88 L 410 90 L -10 90 Z"
          className="fill-amber-200/50"
        />
      </svg>
    </div>
  );
}
