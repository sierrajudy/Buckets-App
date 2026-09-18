/** The base pulsing block every shape below is built from — a plain
 * "Loading…" string was the only loading state anywhere in the app; these
 * give each screen a placeholder roughly shaped like what's about to
 * appear, which reads as considerably more finished for near-zero cost. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}

/** A row of plain text-line placeholders — for anywhere a paragraph or a
 * label is about to load in. */
export function SkeletonLines({ count = 2, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === count - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A list row shaped like the avatar-plus-name-plus-detail rows used all
 * over (friends, standings, round history) — an optional avatar circle,
 * two stacked text lines, and a shrink-0 slot on the right for whatever
 * badge/button/number that row would normally show. */
export function SkeletonRow({ withAvatar = true, className = "" }: { withAvatar?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {withAvatar && <Skeleton className="w-9 h-9 rounded-full shrink-0" />}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-12 rounded-lg shrink-0" />
    </div>
  );
}

export function SkeletonRows({ count = 3, withAvatar = true, className = "" }: { count?: number; withAvatar?: boolean; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} withAvatar={withAvatar} />
      ))}
    </div>
  );
}

/** A grid of number+label stat placeholders — matches FriendProfile's
 * standings card (rounds/wins/holes won/etc.). */
export function SkeletonStatGrid({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-3 sm:grid-cols-6 gap-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      ))}
    </div>
  );
}
