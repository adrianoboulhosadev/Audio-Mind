'use client'

import type { TranscriptionDTO } from '@transcription/adapters'
import { formatDuration } from '@/lib/format'
import type { AudioPlayerState } from '../../hooks/use-audio-player'
import { useTranscriptPanel } from './hooks/use-transcript-panel'

/**
 * The full transcript, collapsed by default: it is the RAW material, and a wall
 * of text above the summary would bury the thing the user actually came for.
 *
 * When the model reported timestamps (it does, in the same answer that carries
 * the text), each stretch becomes a button that moves the player to the second
 * it was said, and the line being spoken stays highlighted. That is what turns
 * an hour of audio from something you re-listen to into something you navigate.
 * Without them — an older transcript, a model that did not report any — it falls
 * back to the plain paragraph.
 */
export function TranscriptPanel({
  transcription,
  player,
  defaultOpen,
}: {
  transcription: TranscriptionDTO
  player: AudioPlayerState
  /** Open on arrival — a search sent the reader here to see one line. */
  defaultOpen?: boolean
}) {
  const { open, toggle, activeIndex, listRef, activeRef, onManualScroll } = useTranscriptPanel(
    transcription.segments,
    player.currentTime,
    player.playing,
    defaultOpen,
  )

  return (
    <section className="rounded-2xl border border-line2 bg-panel p-5">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">Transcrição completa</span>
          <span className="mt-0.5 block text-xs text-muted">
            {transcription.wordCount} palavras
            {transcription.language ? ` · ${transcription.language}` : ''}
            {transcription.segments.length > 0 ? ' · clique numa linha pra ouvir' : ''}
          </span>
        </span>
        <span className="text-xs text-accent">{open ? 'ocultar' : 'mostrar'}</span>
      </button>

      {open ? (
        transcription.segments.length > 0 ? (
          // Scrolls inside itself: an hour of speech is hundreds of lines, and a
          // page that never ends is a page nobody scrolls to the bottom of.
          <ul
            ref={listRef}
            onWheel={onManualScroll}
            onTouchMove={onManualScroll}
            className="mt-4 max-h-96 overflow-y-auto border-t border-line pt-2 animate-fadeUp"
          >
            {transcription.segments.map((segment, index) => (
              <li
                key={`${segment.startSeconds}-${index}`}
                ref={index === activeIndex ? activeRef : undefined}
              >
                <button
                  type="button"
                  onClick={() => player.playFrom(segment.startSeconds)}
                  className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-panel2 ${
                    index === activeIndex ? 'bg-accent-soft/40' : ''
                  }`}
                >
                  <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-accent">
                    {formatDuration(segment.startSeconds)}
                  </span>
                  <span
                    className={`text-sm leading-relaxed ${
                      index === activeIndex ? 'text-ink' : 'text-ink2'
                    }`}
                  >
                    {segment.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed text-ink2 animate-fadeUp">
            {transcription.text}
          </p>
        )
      ) : null}
    </section>
  )
}
