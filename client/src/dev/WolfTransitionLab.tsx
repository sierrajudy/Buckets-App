import { useState } from "react";
import {
  WolfHoleTransition,
  pickWolfTransitionVariant,
  type WolfTransitionVariant,
} from "../components/WolfHoleTransition";
import type { AvatarKey } from "../types";

const SAMPLE_AVATARS: AvatarKey[] = ["ball", "club", "tee", "flag"];
const SAMPLE_SCORE_HECKLES = [null, "Join me!", "Sam Cut! Cut! Cut!"];

const VARIANTS: { key: WolfTransitionVariant; label: string }[] = [
  { key: "cart-course", label: "Cart · course (original)" },
  { key: "hop-forest", label: "Hop · forest" },
  { key: "cart-forest", label: "Cart · forest" },
];

/** Standalone preview for the wolf "next hole" transition, reachable at
 * /dev/wolf-transitions with zero login, room, or server round-trip —
 * see App.tsx, which renders this before AuthProvider/RoomProvider even
 * mount. Point of this page: iterating on the animation itself is normally
 * gated behind getting 4 players into a live wolf round every single time;
 * this skips straight to the transition so it's a one-click replay instead.
 * Delete this file (and the App.tsx branch that renders it) once the real
 * in-game transition is finished and no longer needs fast iteration. */
export function WolfTransitionLab() {
  const [variant, setVariant] = useState<WolfTransitionVariant>("cart-course");
  const [scoreHeckleIdx, setScoreHeckleIdx] = useState(0);
  const [playKey, setPlayKey] = useState(0);

  function replay(next?: WolfTransitionVariant) {
    if (next) setVariant(next);
    setPlayKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="relative z-10 p-4 flex flex-wrap items-center gap-2 border-b border-white/10 bg-neutral-950/90">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50 mr-1">Variant</span>
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => replay(v.key)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              variant === v.key ? "bg-white text-black border-white" : "border-white/30 hover:border-white/60"
            }`}
          >
            {v.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => replay(pickWolfTransitionVariant())}
          className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-300 text-sm font-semibold hover:bg-amber-400/10"
        >
          🎲 Random (as the game would pick)
        </button>
        <button
          type="button"
          onClick={() => replay()}
          className="px-3 py-1.5 rounded-lg border border-white/30 text-sm font-semibold hover:border-white/60"
        >
          ↻ Replay
        </button>

        <span className="w-full basis-full h-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50 mr-1">
          cart-course score heckle
        </span>
        {SAMPLE_SCORE_HECKLES.map((h, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setScoreHeckleIdx(i);
              replay();
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              scoreHeckleIdx === i ? "bg-white text-black border-white" : "border-white/30 hover:border-white/60"
            }`}
          >
            {h ?? "(none)"}
          </button>
        ))}
      </div>

      <div className="relative w-full" style={{ height: "calc(100vh - 116px)" }}>
        <WolfHoleTransition
          key={playKey}
          variant={variant}
          avatars={SAMPLE_AVATARS}
          scoreHeckle={SAMPLE_SCORE_HECKLES[scoreHeckleIdx]}
          durationMs={3200}
        />
      </div>
    </div>
  );
}
