import { ValidationError, Errors, Validator } from 'shared'

/**
 * What the user calls this audio. Free text — it names a thing, it is not a
 * catalogue entry — with a required value and a length ceiling: without one, a
 * crafted request stores an unbounded string (the Prisma column is TEXT) and
 * inflates every log on the way.
 */
export class RecordingTitle {
  static readonly MAX_LENGTH = 120

  /**
   * What an audio is called when nobody named it.
   *
   * It lives HERE and not in the front because it is not a label — it is the
   * mark that says "this name is still up for grabs", which is what lets the
   * pipeline offer the summary's headline later without ever stepping on a name
   * a person typed.
   */
  static readonly PLACEHOLDER = 'Áudio sem título'

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (!this.value) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    const tooLong = Validator.maxLength(
      this.value,
      RecordingTitle.MAX_LENGTH,
      Errors.RECORDING_TITLE_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }

  /** Nobody named this audio yet. */
  get isPlaceholder(): boolean {
    return this.value === RecordingTitle.PLACEHOLDER
  }
}
