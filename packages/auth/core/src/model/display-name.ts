import { ValidationError, Errors } from 'shared'

/**
 * The user's display name — what shows up in the header and on a generated PDF.
 * Display-only: it never authenticates (the Email is the identity), so the only
 * rule is a length ceiling. Empty/whitespace is a legitimate "no name", which
 * is why this VO is only built when there IS a value (see User.editProfile).
 */
export class DisplayName {
  static readonly MAX_LENGTH = 80

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ''
    if (this.value.length > DisplayName.MAX_LENGTH) {
      ValidationError.throwError(Errors.NAME_TOO_LONG, undefined, {
        max: DisplayName.MAX_LENGTH,
        length: this.value.length,
      })
    }
  }
}
