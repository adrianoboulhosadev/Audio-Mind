'use client'

import { useState } from 'react'
import type { TranscriptionDTO } from '@transcription/adapters'

/**
 * The full transcript, collapsed by default: it is the RAW material, and a wall
 * of text above the summary would bury the thing the user actually came for.
 */
export function TranscriptPanel({ transcription }: { transcription: TranscriptionDTO }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">Transcrição completa</span>
          <span className="mt-0.5 block text-xs text-muted">
            {transcription.wordCount} palavras
            {transcription.language ? ` · ${transcription.language}` : ''}
          </span>
        </span>
        <span className="text-xs text-accent">{open ? 'ocultar' : 'mostrar'}</span>
      </button>

      {open ? (
        <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed text-ink2 animate-fadeUp">
          {transcription.text}
        </p>
      ) : null}
    </section>
  )
}
