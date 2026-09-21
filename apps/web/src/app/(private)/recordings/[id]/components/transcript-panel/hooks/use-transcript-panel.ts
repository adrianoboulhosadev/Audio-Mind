'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { TranscriptionDTO } from '@transcription/adapters'

/** How long the list stops following the audio after the reader scrolls it by
 * hand. Long enough to read a paragraph without being yanked away. */
const MANUAL_SCROLL_GRACE_MS = 6_000

/**
 * Which line is being said right now, plus the collapsed/expanded state, the
 * list following along, and copying the whole transcript out.
 *
 * The index is derived from the player's clock instead of being stored: the
 * `<audio>` element is the source of truth for where we are, and a second copy
 * of "the current line" is how a highlight ends up disagreeing with the sound.
 */
export function useTranscriptPanel(
  transcription: TranscriptionDTO,
  currentTime: number,
  playing: boolean,
  defaultOpen = false,
) {
  const { segments, text } = transcription
  const [open, setOpen] = useState(defaultOpen)
  const listRef = useRef<HTMLUListElement | null>(null)
  const activeRef = useRef<HTMLLIElement | null>(null)
  const scrolledByHandAt = useRef(0)

  const activeIndex = useMemo(
    () =>
      segments.findIndex(
        (segment) => currentTime >= segment.startSeconds && currentTime < segment.endSeconds,
      ),
    [segments, currentTime],
  )

  // The list follows the audio, but stops the moment the reader takes over —
  // otherwise scrolling back to re-read a line turns into a fight with the
  // player, and the player always wins.
  useEffect(() => {
    if (!open || !playing || activeIndex < 0) return
    if (Date.now() - scrolledByHandAt.current < MANUAL_SCROLL_GRACE_MS) return

    // `nearest` is what makes this a no-op while the line is already visible,
    // instead of re-centring the list every few seconds.
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open, playing, activeIndex])

  return {
    open,
    toggle: () => setOpen((current) => !current),
    activeIndex,
    listRef,
    activeRef,
    /** Wheel/touch on the list — a real person scrolling, not scrollIntoView. */
    onManualScroll: () => {
      scrolledByHandAt.current = Date.now()
    },
    /**
     * The transcript as TEXT, with no timestamps: `text` is the registry of what
     * was said, and the segments are only an index into it. Whoever is copying
     * wants to paste it somewhere else — a minute marker every couple of lines
     * would be noise there, and gluing the segments back together would rebuild
     * the same text worse.
     */
    copy: async () => {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Transcrição copiada.')
      } catch {
        // Clipboard access can be refused (an insecure origin, a permission the
        // user said no to). The text is on screen anyway, so this says what to
        // do instead of failing silently.
        toast.error('Não consegui copiar. Abra a transcrição e copie na mão.')
      }
    },
  }
}
