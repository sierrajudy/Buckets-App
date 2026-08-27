/** Baseball mode's own theme: a big stitched baseball sitting low and
 * centered in the background, over a dirt infield diamond with the bases
 * laid out in the foreground. Everything here is pinned to the browser
 * viewport (position: fixed) rather than the page, so the whole scene
 * stays frozen in place at the same spot on screen as the page scrolls
 * past underneath it. Callers pair this with a dark navy gradient on their
 * own root element (see Lobby / Scorecard) and add a little extra bottom
 * padding of their own so the infield never fights for legibility with
 * real controls near the bottom of the page. */

/** A big stitched baseball, low-opacity so it reads as a background
 * watermark behind the (mostly opaque) cards rather than competing with
 * them. */
function BigBaseball() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-20">
      <svg viewBox="0 0 300 300" className="w-[85vw] max-w-[420px] h-auto">
        <circle cx="150" cy="150" r="130" className="fill-neutral-50" />
        <path d="M55 45 Q110 150 55 255" fill="none" stroke="#dc2626" strokeWidth="6" />
        <path d="M245 45 Q190 150 245 255" fill="none" stroke="#dc2626" strokeWidth="6" />
        {[70, 95, 205, 230].map((y, i) => (
          <g key={i}>
            <line x1={i < 2 ? 45 : 255} y1={y - 7} x2={i < 2 ? 65 : 275} y2={y + 7} stroke="#dc2626" strokeWidth="3.5" />
            <line x1={i < 2 ? 45 : 255} y1={y + 7} x2={i < 2 ? 65 : 275} y2={y - 7} stroke="#dc2626" strokeWidth="3.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** The infield dirt as a diamond wedge with the bases laid out on its
 * points — home plate at the front, 1st/2nd/3rd fanning out behind it. */
function InfieldDiamond() {
  return (
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-full">
      <path d="M-10,90 L130,20 L200,-10 L270,20 L410,90 Z" className="fill-orange-950/70" />
      <path d="M60,90 L170,32 L200,18 L230,32 L340,90 Z" className="fill-green-950" />
      <path d="M120,90 L185,45 L200,38 L215,45 L280,90 Z" className="fill-orange-900" />
      {/* bases: 2nd (back), 1st and 3rd (sides), home (front) */}
      <rect x="196" y="30" width="8" height="8" transform="rotate(45 200 34)" className="fill-white" />
      <rect x="158" y="58" width="8" height="8" transform="rotate(45 162 62)" className="fill-white" />
      <rect x="234" y="58" width="8" height="8" transform="rotate(45 238 62)" className="fill-white" />
      <path d="M192,84 L208,84 L208,90 L192,90 Z" className="fill-white" />
    </svg>
  );
}

export function BaseballBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <BigBaseball />

      <div className="absolute inset-x-0 bottom-0 h-36 sm:h-52">
        <InfieldDiamond />
      </div>
    </div>
  );
}
