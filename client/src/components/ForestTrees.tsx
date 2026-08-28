/** Shared pine tree-line silhouette (two staggered rows for depth), used by
 * WolfBackdrop (the frozen lobby/scorecard background) and the wolf
 * hole-transition screens that also want a forest floor. Factored out here
 * so both places draw the exact same trees instead of two copies drifting
 * apart. */

interface Tree {
  x: number;
  h: number;
  w: number;
}

function pine({ x, h, w }: Tree, key: number) {
  return (
    <polygon
      key={key}
      points={`${x},${90 - h} ${x - w * 0.5},${90 - h * 0.4} ${x - w * 0.22},${90 - h * 0.4} ${x - w * 0.62},${90} ${x + w * 0.62},${90} ${x + w * 0.22},${90 - h * 0.4} ${x + w * 0.5},${90 - h * 0.4}`}
    />
  );
}

const BACK_ROW: Tree[] = [
  { x: 10, h: 42, w: 30 },
  { x: 55, h: 34, w: 24 },
  { x: 95, h: 48, w: 32 },
  { x: 140, h: 36, w: 26 },
  { x: 185, h: 50, w: 34 },
  { x: 230, h: 34, w: 24 },
  { x: 270, h: 44, w: 30 },
  { x: 315, h: 38, w: 26 },
  { x: 360, h: 48, w: 32 },
  { x: 395, h: 34, w: 24 },
];

const FRONT_ROW: Tree[] = [
  { x: -5, h: 62, w: 40 },
  { x: 35, h: 50, w: 34 },
  { x: 80, h: 68, w: 46 },
  { x: 125, h: 48, w: 32 },
  { x: 170, h: 64, w: 44 },
  { x: 215, h: 52, w: 36 },
  { x: 260, h: 70, w: 46 },
  { x: 305, h: 50, w: 34 },
  { x: 350, h: 62, w: 40 },
  { x: 400, h: 54, w: 36 },
];

export function ForestTreeLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" className={className}>
      <g className="fill-emerald-950/60">{BACK_ROW.map(pine)}</g>
      <g className="fill-emerald-950 opacity-90">{FRONT_ROW.map(pine)}</g>
    </svg>
  );
}
