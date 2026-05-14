// Skeleton placeholders shown while initial data loads. Repeats the
// shape of the real components so the layout doesn't jump on first
// paint. Subsequent refresh fetches are silent (see ShellContext) so
// these only render on first arrival to a page or after a project
// switch.

export function SkeletonAccountRow() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3"
    >
      <span className="h-9 w-9 shrink-0 rounded-full animate-pulse bg-surface-2" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block h-3 w-32 rounded-xs animate-pulse bg-surface-2" />
        <span className="block h-2.5 w-44 rounded-xs animate-pulse bg-surface-2" />
      </span>
    </div>
  );
}

export function SkeletonAccountList({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonAccountRow />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonProjectRow() {
  return (
    <div
      aria-hidden
      className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-4"
    >
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full animate-pulse bg-surface-2" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block h-3 w-40 rounded-xs animate-pulse bg-surface-2" />
        <span className="block h-2.5 w-56 rounded-xs animate-pulse bg-surface-2" />
        <span className="block h-2 w-28 rounded-xs animate-pulse bg-surface-2" />
      </span>
    </div>
  );
}

export function SkeletonProjectList({ count = 3 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonProjectRow />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonStatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          aria-hidden
          key={i}
          className="space-y-1.5 rounded-md border border-line bg-surface px-3 py-3"
        >
          <span className="block h-2 w-14 rounded-xs animate-pulse bg-surface-2" />
          <span className="block h-5 w-10 rounded-xs animate-pulse bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAccountDetail() {
  return (
    <>
      <section className="mb-4 flex items-start gap-3" aria-hidden>
        <span className="h-14 w-14 shrink-0 rounded-full animate-pulse bg-surface-2" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="block h-4 w-40 rounded-xs animate-pulse bg-surface-2" />
          <span className="block h-3 w-24 rounded-xs animate-pulse bg-surface-2" />
        </div>
      </section>
      <SkeletonStatsGrid />
      <div className="mt-5 h-11 w-full rounded-sm animate-pulse bg-surface-2" aria-hidden />
    </>
  );
}
