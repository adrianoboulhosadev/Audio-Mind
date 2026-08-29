import { TranscriptSegmentDTO } from './transcription-dto'

/**
 * WHERE a search term showed up in a transcript. `startSeconds` is null when the
 * transcript has no segments (an older one, or a model that reported none) —
 * then there is an excerpt to read but no moment to jump to.
 */
export interface TranscriptMatchDTO {
  recordingId: string
  excerpt: string
  startSeconds: number | null
}

/** How much text to show around the term when the excerpt has to be cut out of
 * the full transcript. Enough to read a thought, short enough for one line. */
const EXCERPT_RADIUS = 90

/**
 * Finds the term in a transcript and answers with something worth showing.
 *
 * A SEGMENT is preferred over a window of characters, and not just because it
 * carries the second it was said: a segment is a sentence the person actually
 * spoke, while a slice of the full text starts and ends mid-word. The character
 * window is the fallback for a transcript with no segments.
 *
 * Returns null when the term is not in the text — which happens when the row
 * matched on something else (the title, the summary) and this is just being
 * asked in passing.
 */
export function findTranscriptMatch(
  text: string,
  segments: TranscriptSegmentDTO[],
  term: string,
): { excerpt: string; startSeconds: number | null } | null {
  const needle = term.trim().toLowerCase()
  if (!needle) return null

  const segment = segments.find((current) => current.text.toLowerCase().includes(needle))
  if (segment) return { excerpt: segment.text.trim(), startSeconds: segment.startSeconds }

  const index = text.toLowerCase().indexOf(needle)
  if (index < 0) return null

  const from = Math.max(0, index - EXCERPT_RADIUS)
  const to = Math.min(text.length, index + needle.length + EXCERPT_RADIUS)
  const excerpt = text.slice(from, to).trim()

  return {
    excerpt: `${from > 0 ? '…' : ''}${excerpt}${to < text.length ? '…' : ''}`,
    startSeconds: null,
  }
}
