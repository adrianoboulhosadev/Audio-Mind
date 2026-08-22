import { ValidationError, Errors, Validator } from 'shared'

/**
 * What the user calls this audio. Free text — it names a thing, it is not a
 * catalogue entry — with a required value and a length ceiling: without one, a
 * crafted request stores an unbounded string (the Prisma column is TEXT) and
 * inflates every log on the way.
 */
export class RecordingTitle {
  static readonly MAX_LENGTH = 120

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
}
