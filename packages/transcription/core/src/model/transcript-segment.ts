import { ValidationError, Errors, Validator } from 'shared'

/** The raw shape a speech-to-text model returns for one segment. */
export interface TranscriptSegmentInput {
  start?: number
  end?: number
  text?: string
}

/**
 * One stretch of speech with the moment it happened (value object).
 *
 * This is what turns a wall of text into something you can NAVIGATE: clicking a
 * line moves the player to the second it was said. The data is not extra work —
 * `verbose_json` already carries it in the same answer that carries the text.
 *
 * The constructor is strict (a segment that ends before it starts is not a
 * segment), but `parse` is the tolerant door for what a model hands over: a
 * malformed entry is DROPPED, never fatal. The text is the record of what was
 * said; the segments are an index INTO it, and losing the ability to click one
 * line is not a reason to throw away a transcription that worked.
 */
export class TranscriptSegment {
  /** A segment is a sentence or two — anything past this is not a segment. */
  static readonly MAX_TEXT_LENGTH = 5_000

  readonly startSeconds: number
  readonly endSeconds: number
  readonly text: string

  constructor(props: TranscriptSegmentInput) {
    const start = Number(props.start)
    const end = Number(props.end)
    const text = props.text?.trim() ?? ''

    if (!Number.isFinite(start) || start < 0) {
      ValidationError.throwError(Errors.INVALID_TRANSCRIPT_SEGMENT, 'start')
    }
    if (!Number.isFinite(end) || end < start) {
      ValidationError.throwError(Errors.INVALID_TRANSCRIPT_SEGMENT, 'end')
    }
    if (!text) ValidationError.throwError(Errors.INVALID_TRANSCRIPT_SEGMENT, 'text')

    const tooLong = Validator.maxLength(
      text,
      TranscriptSegment.MAX_TEXT_LENGTH,
      Errors.TRANSCRIPT_TOO_LONG,
    )
    if (tooLong) throw tooLong

    this.startSeconds = start
    this.endSeconds = end
    this.text = text
  }

  /** Builds the segment, or null when the model gave something unusable. */
  static parse(input: TranscriptSegmentInput | null | undefined): TranscriptSegment | null {
    if (!input) return null
    try {
      return new TranscriptSegment(input)
    } catch {
      return null
    }
  }
}
