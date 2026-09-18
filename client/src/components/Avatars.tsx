import { AVATAR_KEYS, type AvatarKey } from "../types";
import { useRoom } from "../store";
import { CostumeAccessory, type CostumeKey } from "./costumes";

export { AVATAR_KEYS };
export type { AvatarKey };

export const AVATAR_META: Record<AvatarKey, { label: string; color: string }> = {
  ball: { label: "Golf Ball", color: "#e2e8f0" },
  club: { label: "Club", color: "#94a3b8" },
  tee: { label: "Tee", color: "#fb923c" },
  beer: { label: "Beer", color: "#f59e0b" },
  bag: { label: "Golf Bag", color: "#16a34a" },
  flag: { label: "Flag", color: "#ef4444" },
  cart: { label: "Cart", color: "#3b82f6" },
  cap: { label: "Cap", color: "#ec4899" },
  sun: { label: "Sun", color: "#fbbf24" },
  trophy: { label: "Trophy", color: "#facc15" },
  glove: { label: "Golf Glove", color: "#f8fafc" },
  shoe: { label: "Golf Shoe", color: "#1e293b" },
  tree: { label: "Sequoia Tree", color: "#15803d" },
  divot: { label: "Divot", color: "#78350f" },
  marker: { label: "Ball Marker", color: "#e5e7eb" },
  shirt: { label: "Collared Shirt", color: "#0ea5e9" },
};

function Face({
  x,
  y,
  width,
  height,
  rotate = 0,
  smile = true,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  smile?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#eaf6ff"
        stroke="#0f172a"
        strokeWidth={height * 0.09}
      />
      <circle className="avatar-pupil" cx={-width * 0.16} cy={0} r={height * 0.27} fill="#0f172a" />
      <circle className="avatar-pupil" cx={width * 0.16} cy={0} r={height * 0.27} fill="#0f172a" />
      <circle className="avatar-eye-highlight" cx={-width * 0.1} cy={-height * 0.1} r={height * 0.08} fill="#fff" />
      <circle className="avatar-eye-highlight" cx={width * 0.22} cy={-height * 0.1} r={height * 0.08} fill="#fff" />
      {smile && (
        <path
          d={`M ${-width * 0.22} ${height * 0.62} Q 0 ${height * 0.95} ${width * 0.22} ${height * 0.62}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth={height * 0.07}
          strokeLinecap="round"
        />
      )}
      <circle cx={-width * 0.42} cy={height * 0.35} r={height * 0.12} fill="#f472b6" opacity={0.55} />
      <circle cx={width * 0.42} cy={height * 0.35} r={height * 0.12} fill="#f472b6" opacity={0.55} />
    </g>
  );
}

function BallAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf ball avatar">
      <circle cx="60" cy="64" r="44" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
      {[
        [40, 40],
        [60, 36],
        [80, 42],
        [36, 60],
        [84, 60],
        [44, 82],
        [76, 82],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.4" fill="#cbd5e1" />
      ))}
      <Face x={60} y={62} width={44} height={22} />
    </svg>
  );
}

function ClubAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf club avatar">
      <rect x="55" y="10" width="7" height="46" rx="3.5" fill="#475569" transform="rotate(18 58 33)" />
      <rect x="52" y="8" width="13" height="12" rx="3" fill="#1e293b" transform="rotate(18 58 14)" />
      <path
        d="M30 70 Q28 48 58 46 Q92 46 94 74 Q95 96 66 100 Q38 100 30 70 Z"
        fill="#94a3b8"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <Face x={62} y={74} width={42} height={21} />
    </svg>
  );
}

function TeeAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf tee avatar">
      <rect x="55" y="66" width="10" height="42" rx="4" fill="#fdba74" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M60 108 L52 118 L68 118 Z" fill="#fdba74" stroke="#0f172a" strokeWidth="2.5" />
      <path
        d="M28 34 Q60 14 92 34 Q88 66 60 70 Q32 66 28 34 Z"
        fill="#fb923c"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <Face x={60} y={46} width={44} height={22} />
    </svg>
  );
}

function BeerAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Beer mug avatar">
      <path
        d="M84 40 Q104 40 104 58 Q104 76 84 76"
        fill="none"
        stroke="#0f172a"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="22" y="38" width="62" height="66" rx="10" fill="#f59e0b" stroke="#0f172a" strokeWidth="3" />
      <path
        d="M22 40 Q30 20 45 30 Q52 14 62 28 Q74 18 82 34 Q86 40 84 40 Z"
        fill="#fff7ed"
        stroke="#0f172a"
        strokeWidth="2.5"
      />
      <Face x={53} y={74} width={40} height={20} />
    </svg>
  );
}

function BagAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf bag avatar">
      <circle cx="42" cy="18" r="7" fill="#ef4444" stroke="#0f172a" strokeWidth="2" />
      <circle cx="58" cy="12" r="7" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
      <circle cx="74" cy="18" r="7" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
      <path
        d="M34 30 L86 30 L78 106 Q60 114 42 106 Z"
        fill="#16a34a"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <rect x="42" y="58" width="36" height="34" rx="6" fill="#15803d" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="36" y1="34" x2="20" y2="98" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <Face x={60} y={44} width={38} height={19} />
    </svg>
  );
}

function FlagAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf flag avatar">
      <ellipse cx="60" cy="108" rx="22" ry="7" fill="#1e293b" opacity="0.5" />
      <rect x="56" y="16" width="7" height="92" rx="3.5" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M63 20 L110 40 L63 60 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      <Face x={80} y={38} width={30} height={22} rotate={-4} />
    </svg>
  );
}

function CartAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf cart avatar">
      <rect x="18" y="30" width="80" height="16" rx="6" fill="#3b82f6" stroke="#0f172a" strokeWidth="3" />
      <rect x="26" y="14" width="10" height="20" fill="#1e293b" />
      <rect x="80" y="14" width="10" height="20" fill="#1e293b" />
      <rect x="22" y="46" width="76" height="42" rx="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
      <circle cx="38" cy="98" r="12" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <circle cx="84" cy="98" r="12" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <Face x={60} y={66} width={44} height={20} />
    </svg>
  );
}

function CapAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf cap avatar">
      <path
        d="M20 66 Q22 24 60 22 Q98 24 100 66 Z"
        fill="#ec4899"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <ellipse cx="66" cy="66" rx="42" ry="12" fill="#db2777" stroke="#0f172a" strokeWidth="3" />
      <circle cx="60" cy="24" r="5" fill="#fbcfe8" stroke="#0f172a" strokeWidth="2" />
      <Face x={58} y={48} width={40} height={20} />
    </svg>
  );
}

function SunAvatar() {
  const rays = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Sun avatar">
      {rays.map((angle) => (
        <rect
          key={angle}
          x={57}
          y={6}
          width={6}
          height={20}
          rx={3}
          fill="#fbbf24"
          stroke="#0f172a"
          strokeWidth="2"
          transform={`rotate(${angle} 60 60)`}
        />
      ))}
      <circle cx="60" cy="60" r="34" fill="#fde047" stroke="#0f172a" strokeWidth="3" />
      <Face x={60} y={62} width={36} height={18} />
    </svg>
  );
}

function TrophyAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Trophy avatar">
      <rect x="42" y="94" width="36" height="10" rx="2.5" fill="#a16207" stroke="#0f172a" strokeWidth="2.5" />
      <rect x="53" y="80" width="14" height="16" fill="#facc15" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M33 28 L87 28 Q88 66 60 72 Q32 66 33 28 Z" fill="#facc15" stroke="#0f172a" strokeWidth="3" />
      <path d="M33 32 Q13 32 13 48 Q13 62 33 58" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <path d="M87 32 Q107 32 107 48 Q107 62 87 58" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <Face x={60} y={48} width={34} height={17} />
    </svg>
  );
}

function GloveAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf glove avatar">
      <path
        d="M34 100 Q26 60 34 30 Q38 14 48 16 Q54 18 52 32 Q58 14 68 18 Q72 22 66 36 Q74 20 82 26 Q86 30 78 44 Q92 34 96 44 Q100 52 86 62 Q94 74 88 92 Q84 104 70 106 L44 106 Q36 106 34 100 Z"
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M40 70 L80 70" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="42" y="90" width="34" height="8" rx="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
      <Face x={58} y={80} width={36} height={18} />
    </svg>
  );
}

function ShoeAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Golf shoe avatar">
      <path
        d="M10 96 Q8 106 22 108 L100 108 Q110 108 108 96 Q100 90 86 90 L30 90 Q16 90 10 96 Z"
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth="3"
      />
      {[24, 40, 56, 72, 88].map((x, i) => (
        <path key={i} d={`M${x} 108 L${x - 4} 116 L${x + 4} 116 Z`} fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      ))}
      <path
        d="M14 90 Q10 56 34 40 Q46 30 60 32 Q84 34 96 52 Q106 64 100 90 Z"
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <path d="M14 90 Q10 70 26 62 Q34 58 40 66 Q42 78 34 90 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="52" y1="48" x2="70" y2="56" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="70" y2="66" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="68" x2="68" y2="76" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <Face x={70} y={68} width={34} height={17} />
    </svg>
  );
}

function TreeAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Sequoia tree avatar">
      <rect x="50" y="64" width="20" height="44" rx="4" fill="#92400e" stroke="#0f172a" strokeWidth="3" />
      <path d="M60 6 L84 44 L36 44 Z" fill="#15803d" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 24 L92 62 L28 62 Z" fill="#16a34a" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 42 L98 82 L22 82 Z" fill="#15803d" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      <Face x={60} y={70} width={32} height={16} />
    </svg>
  );
}

function DivotAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Divot avatar">
      <ellipse cx="60" cy="70" rx="46" ry="18" fill="#78350f" stroke="#0f172a" strokeWidth="3" />
      <path
        d="M16 66 Q60 40 104 66 Q100 52 60 46 Q20 52 16 66 Z"
        fill="#4ade80"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {[28, 40, 52, 64, 76, 88].map((x, i) => (
        <path key={i} d={`M${x} 50 L${x - 3} 38 M${x} 50 L${x + 3} 36`} stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <circle cx="14" cy="40" r="3" fill="#78350f" opacity="0.7" />
      <circle cx="106" cy="36" r="2.5" fill="#78350f" opacity="0.6" />
      <Face x={60} y={64} width={40} height={18} />
    </svg>
  );
}

function BallMarkerAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Ball marker avatar">
      <ellipse cx="60" cy="100" rx="40" ry="8" fill="#0f172a" opacity="0.15" />
      <circle cx="60" cy="60" r="46" fill="#e5e7eb" stroke="#0f172a" strokeWidth="3" />
      <circle cx="60" cy="60" r="36" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="36" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 5" />
      <Face x={60} y={62} width={40} height={20} />
    </svg>
  );
}

function ShirtAvatar() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Collared shirt avatar">
      <path d="M30 30 L10 38 Q6 52 18 60 L34 50 Z" fill="#0ea5e9" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M90 30 L110 38 Q114 52 102 60 L86 50 Z" fill="#0ea5e9" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M34 30 Q60 20 86 30 L92 100 Q60 110 28 100 Z" fill="#0ea5e9" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 28 L60 44 L52 30 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M74 28 L60 44 L68 30 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      <line x1="60" y1="44" x2="60" y2="70" stroke="#0f172a" strokeWidth="2" />
      <circle cx="60" cy="52" r="2" fill="#0f172a" />
      <circle cx="60" cy="62" r="2" fill="#0f172a" />
      <Face x={60} y={72} width={38} height={19} />
    </svg>
  );
}

/** Wolf mode's fun little flourish — a pair of ears poking up from behind
 * whatever avatar is showing, drawn in the same 120x120 space so they line
 * up regardless of which icon is underneath. The shape is authored once
 * centered on (60, 19) — most avatars have a roughly centered, symmetric
 * head and just use that default — then re-anchored to (cx, cy) and
 * rotated/scaled for the handful of avatars (Flag, Beer) whose "head" sits
 * off-center or at an angle, via WOLF_EAR_OFFSETS below. */
function WolfEars({ cx = 60, cy = 19, rotate = 0, scale = 1 }: { cx?: number; cy?: number; rotate?: number; scale?: number }) {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0" width="100%" height="100%" aria-hidden="true">
      <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale}) translate(-60 -19)`}>
        <path d="M30 36 L10 2 L46 24 Z" fill="#78716c" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M32 30 L20 8 L42 22 Z" fill="#fbcfe8" />
        <path d="M90 36 L110 2 L74 24 Z" fill="#78716c" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M88 30 L100 8 L78 22 Z" fill="#fbcfe8" />
      </g>
    </svg>
  );
}

/** Per-avatar ear placement overrides, matching each avatar's own Face(x, y,
 * rotate) call above — only needed for the avatars whose head isn't roughly
 * centered on (60, 19) at scale 1. */
const WOLF_EAR_OFFSETS: Partial<Record<AvatarKey, { cx?: number; cy?: number; rotate?: number; scale?: number }>> = {
  // Anchored right at the pole/pennant corner, tilted to match the flag's
  // own diagonal top edge (63,20)->(110,40), and small since the pennant
  // itself is a thin wedge, not a round head.
  flag: { cx: 74, cy: 15, rotate: 18, scale: 0.75 },
  beer: { cx: 54, cy: 20, scale: 0.85 },
  // The clubhead (the big rounded blob) is the "head" here, not the grip
  // up at the top of the shaft — ears sit just above its top edge (~y=46).
  club: { cx: 62, cy: 48, scale: 0.85 },
  // The shoe's "head" is its ankle opening, not empty space above the toe.
  shoe: { cx: 60, cy: 30, scale: 0.85 },
  // Sits right above the shirt's collar, where a head would actually be.
  shirt: { cx: 60, cy: 22, scale: 0.85 },
};

const AVATAR_COMPONENTS: Record<AvatarKey, () => React.JSX.Element> = {
  ball: BallAvatar,
  club: ClubAvatar,
  tee: TeeAvatar,
  beer: BeerAvatar,
  bag: BagAvatar,
  flag: FlagAvatar,
  cart: CartAvatar,
  cap: CapAvatar,
  sun: SunAvatar,
  trophy: TrophyAvatar,
  glove: GloveAvatar,
  shoe: ShoeAvatar,
  tree: TreeAvatar,
  divot: DivotAvatar,
  marker: BallMarkerAvatar,
  shirt: ShirtAvatar,
};

export function AvatarIcon({
  avatar,
  className,
  forceWolfEars,
  costume,
}: {
  avatar: AvatarKey | null;
  className?: string;
  /** Overrides the room-derived wolf check below — for spots that already
   * know for certain they're rendering wolf mode (the hole-transition
   * screens) without a live wolf room to read state from, namely the
   * isolated animation lab at /dev/wolf-transitions. Leave unset anywhere
   * a real room is available; the game itself never needs this. */
  forceWolfEars?: boolean;
  /** An unlocked achievement costume piece to render on top — a player's
   * Player.equippedCostume during a live round, or whatever's selected in
   * the profile's Closet when previewing there. Unrecognized/null values
   * just render nothing, so a stale or not-yet-typed key never crashes
   * this. */
  costume?: string | null;
}) {
  // Every component that renders an avatar lives inside RoomProvider, so
  // this can read the live game mode directly without prop-drilling it
  // through every call site.
  const isWolf = forceWolfEars ?? (useRoom().state?.gameMode === "wolf");
  const costumeKey = (costume ?? null) as CostumeKey | null;

  if (!avatar) {
    return (
      <span className={`relative inline-block ${className ?? ""}`}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="No avatar chosen">
          <circle cx="60" cy="60" r="46" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 6" />
          <text x="60" y="76" textAnchor="middle" fontSize="42" fill="#94a3b8" fontWeight="700">
            ?
          </text>
        </svg>
        {isWolf && <WolfEars />}
        {costumeKey && <CostumeAccessory costume={costumeKey} avatar={avatar} />}
      </span>
    );
  }
  const Cmp = AVATAR_COMPONENTS[avatar];
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Cmp />
      {isWolf && <WolfEars {...WOLF_EAR_OFFSETS[avatar]} />}
      {costumeKey && <CostumeAccessory costume={costumeKey} avatar={avatar} />}
    </span>
  );
}
