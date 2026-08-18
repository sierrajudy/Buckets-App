import { AVATAR_KEYS, type AvatarKey } from "../types";

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
      <circle cx={-width * 0.16} cy={0} r={height * 0.27} fill="#0f172a" />
      <circle cx={width * 0.16} cy={0} r={height * 0.27} fill="#0f172a" />
      <circle cx={-width * 0.1} cy={-height * 0.1} r={height * 0.08} fill="#fff" />
      <circle cx={width * 0.22} cy={-height * 0.1} r={height * 0.08} fill="#fff" />
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

const AVATAR_COMPONENTS: Record<AvatarKey, () => React.JSX.Element> = {
  ball: BallAvatar,
  club: ClubAvatar,
  tee: TeeAvatar,
  beer: BeerAvatar,
  bag: BagAvatar,
  flag: FlagAvatar,
  cart: CartAvatar,
  cap: CapAvatar,
};

export function AvatarIcon({ avatar, className }: { avatar: AvatarKey | null; className?: string }) {
  if (!avatar) {
    return (
      <span className={className}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="No avatar chosen">
          <circle cx="60" cy="60" r="46" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 6" />
          <text x="60" y="76" textAnchor="middle" fontSize="42" fill="#94a3b8" fontWeight="700">
            ?
          </text>
        </svg>
      </span>
    );
  }
  const Cmp = AVATAR_COMPONENTS[avatar];
  return (
    <span className={className}>
      <Cmp />
    </span>
  );
}
