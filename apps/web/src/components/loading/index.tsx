/**
 * Three sizes, one per context of use — none of them takes children, so the
 * caller always picks one deliberately:
 *
 * - `fullScreen`: the auth guards, which run BEFORE the shell (header/sidebar)
 *   exists, so there is no layout box to measure against yet.
 * - default: a page component that returns it before any other JSX. It is the
 *   only child of the private layout's `<main>`, a flex box whose height the
 *   layout has already computed as "screen minus header" — which is the exact
 *   sum a fixed `vh` never gets right.
 * - `compact`: a section inside a page that already rendered something else.
 *
 * flex + justify-center, never `grid place-items-center`: an implicit-row grid
 * stretches each row to split the box evenly and centers each one inside its own
 * half, which opens a gap between the icon and the label.
 */
interface LoadingProps {
  fullScreen?: boolean
  compact?: boolean
  label?: string
}

export function Loading({ fullScreen, compact, label = 'CARREGANDO' }: LoadingProps) {
  const height = fullScreen ? 'min-h-screen' : compact ? '' : 'h-full'

  return (
    <div className={`flex ${height} w-full flex-col items-center justify-center gap-4 py-10`}>
      <div className="flex h-8 items-end gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className="w-1.5 origin-bottom rounded-full bg-accent animate-bounce1"
            style={{ height: '100%', animationDelay: `${bar * 0.12}s` }}
          />
        ))}
      </div>
      <span className="text-xs tracking-[0.2em] text-muted">{label}</span>
      <div className="h-0.5 w-32 overflow-hidden rounded-full bg-line2">
        <div className="h-full w-1/3 rounded-full bg-accent animate-sweep" />
      </div>
    </div>
  )
}
