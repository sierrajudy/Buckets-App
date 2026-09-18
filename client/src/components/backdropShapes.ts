/** Shared polygon-builder for the game's rolling-terrain backdrops — the
 * exact same "one continuous ridge from a list of peak heights" logic used
 * to live duplicated (under different names) in BucketsBackdrop and
 * HighLowBackdrop, and again in AuthBackdrop. One point list, one function:
 * everything from a driving-range fairway to a mountain range to the login
 * screen's hills is just this same shape at different heights and colors. */

export interface RidgePoint {
  x: number;
  h: number;
}

/** Builds a closed polygon string (for an SVG `<polygon points>`) from a
 * left-to-right list of peak heights — the `-10`/`410` end anchors extend
 * past a 0–400 viewBox on both sides so the ridge's slope runs off-screen
 * instead of visibly ending at the viewport edge. */
export function ridgePolygon(points: RidgePoint[]): string {
  const top = points.map(({ x, h }) => `${x},${90 - h}`).join(" ");
  return `-10,90 ${top} 410,90`;
}
