import { ValidationError, Errors, Validator } from 'shared'

/**
 * What the speech-to-text model heard (value object).
 *
 * Empty is not a valid transcript: a model that returns nothing means silence,
 * an unreadable file or a failed call — all of which have to surface as a
 * FAILED recording the user can act on, never as a summary of nothing. The
 * ceiling exists for the same reason every other text field has one: the Prisma
 * column is TEXT, so without it a pathological input is stored as-is.
 */
export class TranscriptText {
  /** ~200k characters is far past a 30-minute audio (the recording ceiling);
   * anything above it is a malfunction, not speech. */
  static readonly MAX_LENGTH = 200_000

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_TRANSCRIPT)

    const tooLong = Validator.maxLength(
      this.value,
      TranscriptText.MAX_LENGTH,
      Errors.TRANSCRIPT_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }

  get wordCount(): number {
    return this.value.split(/\s+/).filter(Boolean).length
  }

  /** A single-line excerpt for a card/list — the full text belongs on the
   * detail screen, not in a listing. */
  preview(maxChars = 180): string {
    const singleLine = this.value.replace(/\s+/g, ' ')
    return singleLine.length <= maxChars ? singleLine : `${singleLine.slice(0, maxChars - 1)}…`
  }
}
