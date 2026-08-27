import { AvatarIcon } from "./Avatars";
import type { AvatarKey } from "../types";

/** High Low's hole-transition scene: the foursome lined up at a driving
 * range, one shared ball launched off the mat, arcing up into the sky above
 * the horizon before dropping back down far out on the grass — tiny, to
 * read as distance — landing right as the overlay that renders this closes.
 * Timing is driven entirely by `durationMs` so the flight always finishes
 * exactly when the overlay does.
 *
 * Everything here is positioned with plain top/left percentages of its
 * parent (Scorecard's fixed-position transition overlay, which already
 * paints the sky/grass gradient and horizon at 55% down) rather than a
 * single scaled SVG viewBox — a viewBox sized for this landscape scene
 * doesn't fit a tall portrait screen without being cropped down to a
 * useless sliver, which is what made the ball and markers read as
 * oversized and stuck low on the grass instead of launching into the sky. */

interface FlagSpec {
  yards: number;
  left: number;
  color: string;
  checkered: boolean;
}

// Six yardage markers, one look each, deliberately scattered left/right
// (not a straight line) so it doesn't read as a ruler — only the vertical
// position (closer to the horizon) and shrinking scale carry the distance.
const FLAGS: FlagSpec[] = [
  { yards: 50, left: 15, color: "#dc2626", checkered: false }, // solid red
  { yards: 100, left: 78, color: "#dc2626", checkered: true }, // checkered red
  { yards: 125, left: 38, color: "#111827", checkered: false }, // solid black
  { yards: 150, left: 65, color: "#111827", checkered: true }, // checkered black
  { yards: 175, left: 24, color: "#eab308", checkered: false }, // yellow
  { yards: 200, left: 50, color: "#16a34a", checkered: false }, // green
];

// Each spot is a cluster of 3 range buckets (a big one plus two smaller
// ones huddled next to it, like a stack left over from restocking) rather
// than a single bucket standing alone.
const BUCKET_GROUPS = [
  { left: 32, yards: 90 },
  { left: 70, yards: 165 },
];
const BUCKET_CLUSTER_OFFSETS = [
  { dLeft: 0, sizeScale: 1 },
  { dLeft: -6.5, sizeScale: 0.72 },
  { dLeft: 5.5, sizeScale: 0.56 },
];

const NEAR_TOP = 80; // % down the screen — right at the near end of the range
const FAR_TOP = 57; // % down the screen — just below the 55% horizon

/** Nearest marker sits low near the tee, farthest sits just past the
 * horizon; everything shrinks as it goes. */
function yardageStyle(yards: number): { top: string; scale: number } {
  const t = (yards - 50) / (200 - 50); // 0 (near) .. 1 (far)
  return { top: `${NEAR_TOP - t * (NEAR_TOP - FAR_TOP)}%`, scale: 1 - t * 0.5 };
}

function Flag({ left, yards, color, checkered }: FlagSpec) {
  const { top, scale } = yardageStyle(yards);
  return (
    <svg
      viewBox="0 0 14 40"
      width={22}
      height={62}
      className="absolute"
      style={{ left: `${left}%`, top, transform: `translate(-50%, -100%) scale(${scale})` }}
    >
      <rect x="6" y="2" width="2" height="38" fill="#57534e" />
      {checkered ? (
        <g>
          <rect x="0" y="0" width="7" height="5" fill={color} />
          <rect x="7" y="0" width="7" height="5" fill="#fff" />
          <rect x="0" y="5" width="7" height="5" fill="#fff" />
          <rect x="7" y="5" width="7" height="5" fill={color} />
        </g>
      ) : (
        <rect x="0" y="0" width="14" height="10" fill={color} />
      )}
    </svg>
  );
}

/** Same little galvanized-pail-with-handle drawing as the app's own splash
 * screen (see Splash.tsx) — just shrunk down and, since several of these
 * render at once, given a unique gradient id so their `<defs>` don't clash. */
function LogoBucket({ left, yards, sizeScale, gradId }: { left: number; yards: number; sizeScale: number; gradId: string }) {
  const { top, scale } = yardageStyle(yards);
  return (
    <svg
      viewBox="0 0 120 100"
      width={32 * sizeScale}
      height={26 * sizeScale}
      className="absolute"
      style={{ left: `${left}%`, top, transform: `translate(-50%, -100%) scale(${scale})` }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#b8c3d1" />
        </linearGradient>
      </defs>
      <path d="M18 30 Q60 20 102 30 L95 92 Q60 100 25 92 Z" fill={`url(#${gradId})`} stroke="#64748b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 52 L103 52 L101 58 L19 58 Z" fill="#94a3b8" opacity="0.7" />
      <path d="M21 74 L99 74 L97.5 79 L22.5 79 Z" fill="#94a3b8" opacity="0.7" />
      <ellipse cx="60" cy="30" rx="42" ry="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
      <path d="M25 27 Q60 2 95 27" fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
      <path d="M25 27 Q60 2 95 27" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A little swung club, anchored at its grip so the animation can just
 * rotate it — planted just in front of whichever avatar is "hitting", timed
 * to strike right as that avatar's own ball appears. The centering
 * translateX lives on the outer span (a static transform) so the inner
 * svg's rotate animation doesn't clobber it — same reason the avatar
 * centering is split in two. */
function ClubSwing({ left, durationMs, delayMs }: { left: number; durationMs: number; delayMs: number }) {
  return (
    <span className="absolute" style={{ left: `${left}%`, bottom: "calc(13% + 6px)", transform: "translateX(-50%)" }}>
      {/* transformOrigin is the TOP of this box (the grip, in the golfer's
       * hands) — not the head — so rotating sweeps the head through an arc
       * around the hands like an actual swing, instead of around the head. */}
      <svg viewBox="0 0 14 46" width={9} height={30} style={{ transformOrigin: "50% 0%", animation: `club-swing ${durationMs}ms ease-out ${delayMs}ms both` }}>
        <rect x="6" y="0" width="2" height="28" rx="1" fill="#334155" />
        {/* Driver head: rounded and bulbous, not a thin iron blade. */}
        <ellipse cx="7" cy="36" rx="6.5" ry="7.5" fill="#1e293b" />
      </svg>
    </span>
  );
}

/** One golfer's shared ball, each with its own draw-shaped flight (a
 * different `@keyframes` per player, defined in index.css) so all four can
 * launch off in a rapid "cannon" succession, overlap paths in the air, and
 * land on four different flags. `both` fill-mode holds the pre-launch
 * (0%) look during this ball's own start delay — since the four are
 * staggered, the later balls need to just sit tee-side, invisible, while
 * the earlier ones are already in flight — and holds the landed (100%)
 * look afterward the same way the single-ball version needed `forwards`. */
function CannonBall({
  startLeft,
  keyframeName,
  durationMs,
  delayMs,
}: {
  startLeft: number;
  keyframeName: string;
  durationMs: number;
  delayMs: number;
}) {
  return (
    <div
      className="absolute rounded-full bg-white border-[1.5px] border-neutral-900"
      style={{
        width: 18,
        height: 18,
        left: `${startLeft}%`,
        top: "85%",
        transform: "translate(-50%, -50%)",
        animation: `${keyframeName} ${durationMs}ms ease-in-out ${delayMs}ms both`,
      }}
    />
  );
}

// Fired "in a cannon" — each of the 4 golfers swings in rapid succession
// rather than all at once. Scorecard needs this too (to hold the overlay
// open long enough for the last, most-delayed player to finish landing).
export const CANNON_STAGGER_MS = 220;

// One keyframe name + landing flag per player, in swing order. Each ball
// starts near that player and draws (bulges right, then curls back) to a
// *different* flag, so all four paths cross in the air instead of stacking
// on top of each other.
const CANNON_BALLS = [
  { keyframeName: "range-ball-flight-p1" },
  { keyframeName: "range-ball-flight-p2" },
  { keyframeName: "range-ball-flight-p3" },
  { keyframeName: "range-ball-flight-p4" },
];

export function DrivingRange({
  avatars,
  durationMs = 3200,
}: {
  avatars?: (AvatarKey | null)[];
  durationMs?: number;
}) {
  const golfers = (avatars ?? []).slice(0, 4);
  // Centers (not left edges) — each avatar span is centered on its point via
  // translateX(-50%), same convention as the flags/buckets, so widening the
  // avatars never pushes them off the mat's edge.
  const avatarCenterPct = [28, 43, 58, 73];

  return (
    <div className="relative w-full h-full">
      {BUCKET_GROUPS.map((group, gi) =>
        BUCKET_CLUSTER_OFFSETS.map((offset, oi) => (
          <LogoBucket
            key={`${gi}-${oi}`}
            left={group.left + offset.dLeft}
            yards={group.yards}
            sizeScale={offset.sizeScale}
            gradId={`range-bucket-grad-${gi}-${oi}`}
          />
        )),
      )}
      {FLAGS.map((f) => (
        <Flag key={f.yards} {...f} />
      ))}

      {/* Tee mat, right at the front edge — raised clear of the "on to the
       * next hole" banner that sits at the very bottom of the overlay,
       * which would otherwise render right on top of it. Wide enough that
       * the bigger avatars standing on it stay within its edges. */}
      <div
        className="absolute rounded-md border-2 border-neutral-900 flex items-start justify-center gap-6 overflow-hidden"
        style={{
          left: "50%",
          bottom: "13%",
          width: "62%",
          height: "4.5%",
          transform: "translateX(-50%)",
          background: "repeating-linear-gradient(90deg, #a16207 0 6px, #92580a 6px 12px)",
        }}
      >
        {avatarCenterPct.map((_, i) => (
          <span key={i} className="block mt-0.5 w-1 h-1.5 rounded-sm bg-amber-100" />
        ))}
      </div>

      {/* All 4 golfers swing in a rapid cannon succession (player 1, then
          2, then 3, then 4, each ~220ms after the last) rather than one
          shared hitter. +4 (not -4) puts each club on its golfer's right
          side — a right-handed golfer's — which also happens to be the
          side each ball launches toward. */}
      {avatarCenterPct.map((left, i) => (
        <ClubSwing key={i} left={left + 4} durationMs={durationMs} delayMs={i * CANNON_STAGGER_MS} />
      ))}

      {CANNON_BALLS.map((ball, i) => (
        <CannonBall
          key={i}
          startLeft={avatarCenterPct[i] + 4}
          keyframeName={ball.keyframeName}
          durationMs={durationMs}
          delayMs={i * CANNON_STAGGER_MS}
        />
      ))}

      {avatarCenterPct.map((left, i) => (
        // Fixed pixel size (not a %-tall box) so the square avatar icon
        // can't end up letterboxed and vertically centered inside a box
        // taller than it is wide — that centering was what left the
        // avatars floating above the mat instead of standing on it.
        // Centering (translateX) and the bottom anchor live on this
        // static outer span; the avatar-bob idle animation goes on the
        // inner one instead, since a CSS animation on `transform` fully
        // replaces an inline `transform` rather than combining with it.
        // Each avatar icon draws its character with some transparent
        // padding below it inside its own square (varies by avatar, ~10-15%
        // of the box), so anchoring the box's bottom edge to the mat still
        // left visible daylight under the character's feet — the extra
        // 8px nudges the character itself down into that padding.
        <span key={i} className="absolute" style={{ left: `${left}%`, bottom: "14.5%", width: 64, height: 64, transform: "translate(-50%, 8px)" }}>
          <span className="block w-full h-full avatar-idle" style={{ animationDelay: `${i * 0.3}s` }}>
            <AvatarIcon avatar={golfers[i] ?? null} className="w-full h-full" />
          </span>
        </span>
      ))}
    </div>
  );
}
