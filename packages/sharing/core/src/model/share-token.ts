import { Id, ValidationError, Errors } from 'shared'

/**
 * The secret in the URL. Whoever holds it reads the summary, so it has to be
 * unguessable — and it is the ONLY thing standing between a public page and a
 * private recording.
 *
 * Built from two uuid v4s with the dashes removed: 64 hex characters, ~244 bits
 * of randomness from the same CSPRNG the ids already use. Two of them and not
 * one because a uuid in a URL reads like an internal identifier, and this is a
 * credential — someone who sees `/s/<uuid>` may reasonably assume it is a
 * database key and paste it somewhere it does not belong.
 *
 * Note what this is NOT: it is not a session, it does not identify a person, and
 * it names exactly one recording. Same reasoning as the `purpose` on the audio
 * capability token.
 */
export class ShareToken {
  static readonly LENGTH = 64
  static readonly FORMAT = /^[0-9a-f]{64}$/

  readonly value: string

  constructor(value?: string) {
    this.value = value?.trim() ?? ShareToken.generate()

    const invalid = !ShareToken.FORMAT.test(this.value)
    if (invalid) ValidationError.throwError(Errors.INVALID_SHARE_TOKEN)
  }

  private static generate(): string {
    return `${Id.create()}${Id.create()}`.replace(/-/g, '')
  }
}
