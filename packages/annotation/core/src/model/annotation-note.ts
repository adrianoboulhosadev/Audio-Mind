import { ValidationError, Errors, Validator } from 'shared'

/**
 * What the person WROTE at that moment of the audio.
 *
 * Optional by design: a mark with no words ("volta aqui") is the fastest thing
 * to make while listening, and forcing a note would mean people stop marking. So
 * this value object only exists when there is text — an absent note is `null`,
 * not an empty one.
 *
 * Unlike the summary or a task, this text is the USER's, so it can be edited
 * afterwards: nothing here is a record of what a model said.
 */
export class AnnotationNote {
  static readonly MAX_LENGTH = 500

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (!this.value) ValidationError.throwError(Errors.REQUIRED_FIELD, 'note')

    const tooLong = Validator.maxLength(
      this.value,
      AnnotationNote.MAX_LENGTH,
      Errors.ANNOTATION_NOTE_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }

  /** Builds one, or nothing at all — an absent note is a legitimate mark. */
  static from(value?: string | null): AnnotationNote | null {
    return value?.trim() ? new AnnotationNote(value) : null
  }
}
