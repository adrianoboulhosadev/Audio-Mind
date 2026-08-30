'use client'

import { BookmarkPlus, Pencil, Trash2 } from 'lucide-react'
import { AnnotationNote } from '@annotation/adapters'
import { Button } from '@/components/button'
import { IconButton } from '@/components/icon-button'
import { formatDuration } from '@/lib/format'
import type { AudioPlayerState } from '../../hooks/use-audio-player'
import { useMarkersPanel } from './hooks/use-markers-panel'

/**
 * Marks on the timeline of this audio — with or without something written on
 * them.
 *
 * Marking takes ONE tap and asks for nothing: while you are listening, being
 * made to write a note is what stops people marking at all. The words can be
 * added afterwards, and clicking a mark plays from that second, which is the
 * whole point of having them.
 */
export function MarkersPanel({
  recordingId,
  player,
}: {
  recordingId: string
  player: AudioPlayerState
}) {
  const {
    marks,
    mark,
    marking,
    editingId,
    draft,
    setDraft,
    startEditing,
    cancelEditing,
    saveNote,
    remove,
  } = useMarkersPanel(recordingId)

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Marcadores</h2>
        <Button variant="ghost" onClick={() => mark(player.currentTime)} disabled={marking}>
          <BookmarkPlus size={16} aria-hidden />
          Marcar {formatDuration(player.currentTime)}
        </Button>
      </div>

      {marks.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Nada marcado ainda. Ouvindo, um toque em “Marcar” guarda o momento — dá pra escrever o que
          era depois.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {marks.map((item) => (
            <li key={item.id} className="rounded-lg px-2 py-2 transition hover:bg-panel2">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => player.playFrom(item.atSeconds)}
                  className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] tabular-nums text-accent transition hover:brightness-110"
                  aria-label={`Tocar a partir de ${formatDuration(item.atSeconds)}`}
                >
                  {formatDuration(item.atSeconds)}
                </button>

                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={draft}
                    maxLength={AnnotationNote.MAX_LENGTH}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => saveNote(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveNote(item.id)
                      if (event.key === 'Escape') cancelEditing()
                    }}
                    placeholder="O que era esse momento?"
                    className="min-w-0 flex-1 rounded-md border border-line2 bg-panel2 px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="min-w-0 flex-1 text-left text-sm text-ink2"
                  >
                    {item.note || <span className="text-muted">Sem anotação — clique pra escrever</span>}
                  </button>
                )}

                <div className="-my-1.5 -mr-1.5 flex shrink-0 items-center">
                  {editingId === item.id ? null : (
                    <IconButton
                      label="Escrever nesse marcador"
                      onClick={() => startEditing(item)}
                      icon={<Pencil size={15} aria-hidden />}
                    />
                  )}
                  <IconButton
                    label="Apagar marcador"
                    tone="danger"
                    tipSide="left"
                    onClick={() => remove(item.id)}
                    icon={<Trash2 size={15} aria-hidden />}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
