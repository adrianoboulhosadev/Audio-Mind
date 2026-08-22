import { ValidationError, Errors, Validator } from 'shared'

/**
 * The three pieces of text a summary is made of, each with its own ceiling.
 * They are separate value objects rather than one generic "text" because the
 * ceilings say something: a headline is a line, an overview is paragraphs, a
 * bullet is a sentence — and a model that blows past one of them produced
 * something that is not a summary any more.
 */

/** The one-line title of the summary ("Reunião de alinhamento do time"). */
export class SummaryHeadline {
  static readonly MAX_LENGTH = 150

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim().replace(/\s+/g, ' ') ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_SUMMARY, 'headline')

    const tooLong = Validator.maxLength(
      this.value,
      SummaryHeadline.MAX_LENGTH,
      Errors.SUMMARY_TEXT_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }
}

/** The prose summary — a few paragraphs, the part someone reads instead of
 * listening to the whole audio. */
export class SummaryOverview {
  static readonly MAX_LENGTH = 8_000

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_SUMMARY, 'overview')

    const tooLong = Validator.maxLength(
      this.value,
      SummaryOverview.MAX_LENGTH,
      Errors.SUMMARY_TEXT_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }
}

/** One bullet — a main point or an action item. */
export class SummaryBullet {
  static readonly MAX_LENGTH = 300

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim().replace(/\s+/g, ' ') ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_SUMMARY, 'bullet')

    const tooLong = Validator.maxLength(
      this.value,
      SummaryBullet.MAX_LENGTH,
      Errors.SUMMARY_TEXT_TOO_LONG,
    )
    if (tooLong) throw tooLong
  }
}
