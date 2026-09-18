/** A little outlined bucket-of-balls glyph — same silhouette as the app's
 * mascot (see Splash.tsx / the backdrops' filled version), just a plain
 * `currentColor` outline here so it can sit quietly next to "nothing here
 * yet" copy instead of demanding attention like the full illustration. */
function BucketGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
      <path d="M18 30 Q60 20 102 30 L95 92 Q60 100 25 92 Z" />
      <ellipse cx="60" cy="30" rx="42" ry="8" />
      <circle cx="46" cy="16" r="7" />
      <circle cx="62" cy="10" r="7" />
      <circle cx="78" cy="16" r="7" />
    </svg>
  );
}

/** A shared "nothing here yet" block for empty tables/lists — swaps the
 * plain gray sentence those spots used to show for the same sentence plus
 * a small bucket glyph, so an empty state reads as "nothing here yet" with
 * a bit of the app's own charm instead of a bare error-adjacent line. */
export function EmptyState({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 py-6 text-center ${className}`}>
      <BucketGlyph className="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  );
}
