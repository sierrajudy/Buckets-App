import type { AvatarKey } from "../types";

/** The 12 unlockable avatar accessories, in the exact order the server's
 * achievements.ts COSTUME_SEQUENCE grants them — these key strings must
 * match that file exactly. label/description are shown in the profile's
 * Closet; the SVG itself is what actually renders on the avatar. */
export const COSTUME_SEQUENCE = [
  "beanie",
  "sunglasses",
  "halo",
  "golf_visor",
  "mustache",
  "bowtie",
  "crown",
  "cape",
  "monocle",
  "party_hat",
  "wizard_hat",
  "medal",
] as const;

export type CostumeKey = (typeof COSTUME_SEQUENCE)[number];

export const COSTUME_META: Record<CostumeKey, { label: string; emoji: string }> = {
  beanie: { label: "Beanie", emoji: "🧢" },
  sunglasses: { label: "Sunglasses", emoji: "🕶️" },
  halo: { label: "Halo", emoji: "😇" },
  golf_visor: { label: "Golf Visor", emoji: "🧢" },
  mustache: { label: "Mustache", emoji: "🥸" },
  bowtie: { label: "Bow Tie", emoji: "🎀" },
  crown: { label: "Crown", emoji: "👑" },
  cape: { label: "Cape", emoji: "🦸" },
  monocle: { label: "Monocle", emoji: "🧐" },
  party_hat: { label: "Party Hat", emoji: "🥳" },
  wizard_hat: { label: "Wizard Hat", emoji: "🧙" },
  medal: { label: "Medal", emoji: "🏅" },
};

interface Anchor {
  cx: number;
  cy: number;
  rotate?: number;
  scale?: number;
}

/** The top of each avatar's "head", reused from Avatars.tsx's own wolf-ear
 * placement logic — same spot works for anything that sits on top of the
 * head (a hat, a halo, a crown…). Only the handful of avatars whose head
 * isn't roughly centered on (60, 19) need an override. */
const HEAD_ANCHORS: Partial<Record<AvatarKey, Anchor>> = {
  flag: { cx: 74, cy: 15, rotate: 18, scale: 0.75 },
  beer: { cx: 54, cy: 20, scale: 0.85 },
  club: { cx: 62, cy: 48, scale: 0.85 },
  shoe: { cx: 60, cy: 30, scale: 0.85 },
  shirt: { cx: 60, cy: 22, scale: 0.85 },
};

/** Each avatar's actual face center — lifted straight from that avatar's
 * own <Face x y rotate /> call in Avatars.tsx — for accessories that sit
 * ON the face (sunglasses, monocle) or just below it (a mustache). */
const FACE_ANCHORS: Record<AvatarKey, Anchor> = {
  ball: { cx: 60, cy: 62 },
  club: { cx: 62, cy: 74 },
  tee: { cx: 60, cy: 46 },
  beer: { cx: 53, cy: 74 },
  bag: { cx: 60, cy: 44 },
  flag: { cx: 80, cy: 38, rotate: -4 },
  cart: { cx: 60, cy: 66 },
  cap: { cx: 58, cy: 48 },
  sun: { cx: 60, cy: 62 },
  trophy: { cx: 60, cy: 48 },
  glove: { cx: 58, cy: 80 },
  shoe: { cx: 70, cy: 68 },
  tree: { cx: 60, cy: 70 },
  divot: { cx: 60, cy: 64 },
  marker: { cx: 60, cy: 62 },
  shirt: { cx: 60, cy: 72 },
};

function headAnchor(avatar: AvatarKey | null): Anchor {
  return (avatar && HEAD_ANCHORS[avatar]) ?? { cx: 60, cy: 19 };
}

function faceAnchor(avatar: AvatarKey | null): Anchor {
  return (avatar && FACE_ANCHORS[avatar]) ?? { cx: 60, cy: 60 };
}

/** Fixed near the bottom of the 120x120 canvas regardless of avatar — every
 * avatar is drawn roughly centered and full-height in that same box, so a
 * "worn at the chest" accessory doesn't need per-avatar tuning the way a
 * head or face one does. */
const CHEST_ANCHOR: Anchor = { cx: 60, cy: 100 };

function Group({ anchor, dy = 0, extraRotate = 0, children }: { anchor: Anchor; dy?: number; extraRotate?: number; children: React.ReactNode }) {
  const { cx, cy, rotate = 0, scale = 1 } = anchor;
  return (
    <g transform={`translate(${cx} ${cy + dy}) rotate(${rotate + extraRotate}) scale(${scale})`}>{children}</g>
  );
}

/** Renders whichever costume piece is equipped, correctly anchored for the
 * given avatar. Mirrors Avatars.tsx's WolfEars — an absolutely-positioned
 * sibling SVG layered over the avatar's own artwork, not part of it. */
export function CostumeAccessory({ costume, avatar }: { costume: CostumeKey; avatar: AvatarKey | null }) {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0" width="100%" height="100%" aria-hidden="true">
      {costume === "beanie" && (
        <Group anchor={headAnchor(avatar)}>
          <path d="M-32 4 Q-30 -26 0 -26 Q30 -26 32 4 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="2.5" />
          <rect x="-34" y="-1" width="68" height="8" rx="4" fill="#b91c1c" stroke="#0f172a" strokeWidth="2" />
          <circle cx="0" cy="-28" r="6" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
        </Group>
      )}

      {costume === "sunglasses" && (
        <Group anchor={faceAnchor(avatar)}>
          <rect x="-30" y="-8" width="24" height="16" rx="6" fill="#0f172a" />
          <rect x="6" y="-8" width="24" height="16" rx="6" fill="#0f172a" />
          <rect x="-6" y="-3" width="12" height="4" fill="#0f172a" />
          <line x1="-30" y1="-2" x2="-40" y2="-6" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="30" y1="-2" x2="40" y2="-6" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        </Group>
      )}

      {costume === "halo" && (
        <Group anchor={headAnchor(avatar)} dy={-16}>
          <ellipse cx="0" cy="0" rx="20" ry="6" fill="none" stroke="#fbbf24" strokeWidth="4" />
          <ellipse cx="0" cy="0" rx="20" ry="6" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity="0.8" />
        </Group>
      )}

      {costume === "golf_visor" && (
        <Group anchor={headAnchor(avatar)} dy={6}>
          <path d="M-30 0 Q-28 -16 0 -16 Q28 -16 30 0" fill="none" stroke="#f8fafc" strokeWidth="9" strokeLinecap="round" />
          <path d="M-30 0 Q-28 -16 0 -16 Q28 -16 30 0" fill="none" stroke="#0f172a" strokeWidth="9.5" strokeLinecap="round" opacity="0.15" />
          <ellipse cx="0" cy="3" rx="26" ry="7" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
        </Group>
      )}

      {costume === "mustache" && (
        <Group anchor={faceAnchor(avatar)} dy={16}>
          <path
            d="M-18 6 Q-10 -4 0 2 Q10 -4 18 6 Q10 0 0 4 Q-10 0 -18 6 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        </Group>
      )}

      {costume === "bowtie" && (
        <Group anchor={CHEST_ANCHOR}>
          <path d="M-18 0 L-2 -8 L-2 8 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          <path d="M18 0 L2 -8 L2 8 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="0" cy="0" r="4" fill="#991b1b" stroke="#0f172a" strokeWidth="1.5" />
        </Group>
      )}

      {costume === "crown" && (
        <Group anchor={headAnchor(avatar)} dy={-4}>
          <path
            d="M-28 6 L-28 -10 L-16 2 L-6 -16 L6 2 L16 -16 L28 -10 L28 6 Z"
            fill="#facc15"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="-16" cy="-4" r="3" fill="#ef4444" />
          <circle cx="0" cy="-8" r="3.5" fill="#3b82f6" />
          <circle cx="16" cy="-4" r="3" fill="#ef4444" />
        </Group>
      )}

      {costume === "cape" && (
        <Group anchor={CHEST_ANCHOR} dy={-10}>
          <path d="M-34 -6 L-42 26 L-20 18 Z" fill="#7c3aed" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          <path d="M34 -6 L42 26 L20 18 Z" fill="#7c3aed" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
        </Group>
      )}

      {costume === "monocle" && (
        <Group anchor={faceAnchor(avatar)}>
          <circle cx="-9" cy="0" r="10" fill="#fef9c3" opacity="0.25" stroke="#facc15" strokeWidth="2.5" />
          <path d="M1 8 Q10 20 6 34" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        </Group>
      )}

      {costume === "party_hat" && (
        <Group anchor={headAnchor(avatar)} dy={-10} extraRotate={14}>
          <path d="M-14 4 L0 -34 L14 4 Z" fill="#ec4899" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="-6" cy="-6" r="3" fill="#facc15" />
          <circle cx="4" cy="-16" r="3" fill="#3b82f6" />
          <circle cx="0" cy="-34" r="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
        </Group>
      )}

      {costume === "wizard_hat" && (
        <Group anchor={headAnchor(avatar)} dy={-16}>
          <path
            d="M-30 6 Q-10 4 0 -46 Q10 4 30 6 Q0 14 -30 6 Z"
            fill="#4338ca"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <g stroke="#fde68a" strokeWidth="2" strokeLinecap="round">
            <line x1="-8" y1="-22" x2="-8" y2="-14" />
            <line x1="-12" y1="-18" x2="-4" y2="-18" />
          </g>
        </Group>
      )}

      {costume === "medal" && (
        <Group anchor={CHEST_ANCHOR} dy={-4}>
          <path d="M-10 -6 L0 6 L10 -6" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
          <circle cx="0" cy="12" r="10" fill="#facc15" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="0" cy="12" r="5" fill="#fde68a" />
        </Group>
      )}
    </svg>
  );
}
