import { ValidationError, Errors, Validator } from 'shared'

/**
 * One thing somebody has to do, as it was said in the audio.
 *
 * The ceiling is the SAME as a summary bullet's, and deliberately so: a task is
 * a bullet that was promoted out of the summary, so a text that fits there
 * always fits here — if the two ever disagreed, the pipeline would accept a
 * summary and then fail to materialize its own action items.
 */
export class TaskText {
  static readonly MAX_LENGTH = 300

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim().replace(/\s+/g, ' ') ?? ''
    if (!this.value) ValidationError.throwError(Errors.EMPTY_TASK, 'text')

    const tooLong = Validator.maxLength(this.value, TaskText.MAX_LENGTH, Errors.TASK_TEXT_TOO_LONG)
    if (tooLong) throw tooLong
  }
}
