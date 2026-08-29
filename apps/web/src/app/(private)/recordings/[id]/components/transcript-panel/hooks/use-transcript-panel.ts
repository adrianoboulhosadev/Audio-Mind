'use client'

import { useMemo, useState } from 'react'
import type { TranscriptSegmentDTO } from '@transcription/adapters'

/**
 * Which line is being said right now, plus the collapsed/expanded state.
 *
 * The index is derived from the player's clock instead of being stored: the
 * `<audio>` element is the source of truth for where we are, and a second copy
 * of "the current line" is how a highlight ends up disagreeing with the sound.
 */
export function useTranscriptPanel(segments: TranscriptSegmentDTO[], currentTime: number) {
  const [open, setOpen] = useState(false)

  const activeIndex = useMemo(
    () =>
      segments.findIndex(
        (segment) => currentTime >= segment.startSeconds && currentTime < segment.endSeconds,
      ),
    [segments, currentTime],
  )

  return { open, toggle: () => setOpen((current) => !current), activeIndex }
}
