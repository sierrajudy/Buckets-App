import { GolfCart } from "./GolfCart";
import { HecklerGuy } from "./HecklerGuy";
import { ForestTreeLine } from "./ForestTrees";
import { WolfHoppers } from "./WolfHoppers";
import type { AvatarKey } from "../types";

/** Wolf's "next hole" transition has three interchangeable looks that take
 * turns at random (see pickWolfTransitionVariant) — cart-course is the
 * original night-sky-over-the-green scene, the other two move the scene
 * into the forest (moon + tree-line) and swap in either a hopping foursome
 * or the same cart, each with its own fixed one-liner from the heckler
 * instead of the usual score-based commentary. */
export type WolfTransitionVariant = "cart-course" | "hop-forest" | "cart-forest";

const VARIANTS: WolfTransitionVariant[] = ["cart-course", "hop-forest", "cart-forest"];

export function pickWolfTransitionVariant(): WolfTransitionVariant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}

export const HOP_FOREST_HECKLE = "Get the chainsaw!";
export const CART_FOREST_HECKLE = "What do you call a wolf you can't find? A where-wolf.";

export function WolfHoleTransition({
  variant,
  avatars,
  scoreHeckle,
  durationMs,
}: {
  variant: WolfTransitionVariant;
  avatars: (AvatarKey | null)[];
  /** The usual score-based line (Join me! / Cut! Cut! Cut! / null) — only
   * used on cart-course, which keeps its original behavior. The other two
   * variants always show their own fixed joke instead. */
  scoreHeckle: string | null;
  durationMs: number;
}) {
  const isForest = variant !== "cart-course";
  const heckleMessage =
    variant === "hop-forest" ? HOP_FOREST_HECKLE : variant === "cart-forest" ? CART_FOREST_HECKLE : scoreHeckle;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #1e1b4b 0%, #312e81 55%, #14532d 55%, #052e16 100%)",
      }}
    >
      <div className="absolute top-8 right-14 w-14 h-14 rounded-full bg-amber-100 shadow-[0_0_40px_10px_rgba(252,211,77,0.35)]" />
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/80"
          style={{ left: `${(i * 47) % 100}%`, top: `${(i * 29) % 50}%` }}
        />
      ))}

      {isForest && <ForestTreeLine className="absolute inset-x-0 bottom-0 w-full h-28 sm:h-40" />}

      {heckleMessage && <HecklerGuy message={heckleMessage} />}

      {variant === "hop-forest" ? (
        <WolfHoppers avatars={avatars} durationMs={durationMs} />
      ) : (
        <div
          className="absolute"
          style={{ bottom: isForest ? "14%" : "18%", animation: `cart-drive-across ${durationMs}ms ease-in-out` }}
        >
          <GolfCart avatars={avatars} size={180} forceWolfEars />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-10 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 text-green-700 dark:text-green-400 font-bold text-sm shadow">
          🐺 Awoooo! Next hole
        </span>
      </div>
    </div>
  );
}
