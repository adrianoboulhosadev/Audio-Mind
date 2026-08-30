'use client'

import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import { Loading } from '@/components/loading'
import { formatDuration } from '@/lib/format'
import { useMarkers } from './hooks/use-markers'

/**
 * Everything the user marked, across the whole library.
 *
 * This screen is what makes marking worth doing: what brings somebody back to an
 * audio from three months ago is remembering that they marked something in it,
 * not remembering which audio it was. Every line opens the recording AT that
 * second — the same `?t=` the search results use.
 */
export default function MarkersPage() {
  const { groups, total, isLoading } = useMarkers()

  if (isLoading) return <Loading />

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Marcadores <span className="text-muted">({total})</span>
        </h2>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line2 px-4 py-12 text-center">
          <Bookmark size={28} className="mx-auto text-muted" aria-hidden />
          <p className="mt-3 text-sm text-muted">
            Nenhum marcador ainda. Abra um áudio e toque em “Marcar” no momento que você vai querer
            de volta.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.recordingId} className="rounded-xl border border-line2 bg-panel p-4">
              <Link
                href={`/recordings/${group.recordingId}`}
                className="block truncate text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-accent"
              >
                {group.recordingTitle}
              </Link>

              <ul className="mt-3 flex flex-col gap-1">
                {group.items.map(({ annotation }) => (
                  <li key={annotation.id}>
                    {/* `?t=` põe o player no segundo marcado — o mesmo caminho
                        que um resultado de busca usa. */}
                    <Link
                      href={`/recordings/${group.recordingId}?t=${annotation.atSeconds}`}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-panel2"
                    >
                      <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] tabular-nums text-accent">
                        {formatDuration(annotation.atSeconds)}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-ink2">
                        {annotation.note || <span className="text-muted">Momento marcado</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
