import { AvatarIcon } from "./Avatars";
import type { AvatarKey } from "../types";

/** Wolf mode's "hopping through the forest" hole transition: the foursome
 * on foot instead of in a cart, each one bouncing on their own staggered
 * loop (hop-bounce) while the whole row sweeps across the screen together
 * (cart-drive-across, same sweep the cart itself uses, on the wrapping
 * element) — so it reads as a little pack of golfers loping along rather
 * than a single rigid block. Always wolf-eared: this component only ever
 * appears inside a wolf hole transition. */
export function WolfHoppers({ avatars, durationMs }: { avatars: (AvatarKey | null)[]; durationMs: number }) {
  const walkers = avatars.slice(0, 4);

  return (
    <div className="absolute inset-x-0" style={{ bottom: "16%", animation: `cart-drive-across ${durationMs}ms ease-in-out` }}>
      <div className="flex items-end justify-center gap-4">
        {walkers.map((a, i) => (
          <div key={i} style={{ animation: `hop-bounce 0.55s ease-in-out ${i * 0.13}s infinite` }}>
            <AvatarIcon avatar={a} className="w-14 h-14 sm:w-20 sm:h-20" forceWolfEars />
          </div>
        ))}
      </div>
    </div>
  );
}
