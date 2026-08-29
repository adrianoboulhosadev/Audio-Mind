import { ValidationError, Errors, Validator } from 'shared'

/**
 * What the user wants to know about one recording (value object).
 *
 * It is user input reaching the domain, so it has a ceiling like every other
 * text field here: the prompt is built around it, and an unbounded question
 * would be a way to push a wall of text into the model on someone else's quota.
 */
export class TranscriptQuestion {
  /** A question, not a document. Two or three sentences fit comfortably. */
  static readonly MAX_LENGTH = 500

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_QUESTION)

    const tooLong = Validator.maxLength(
      this.value,
      TranscriptQuestion.MAX_LENGTH,
      Errors.QUESTION_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }
}
