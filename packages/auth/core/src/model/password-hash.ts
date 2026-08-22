import { ValidationError, Errors } from 'shared'

/**
 * Stored password hash value object: validates the bcrypt shape so the domain
 * never holds a bogus credential. Built from the hashing port's output (never
 * from plaintext). The raw-policy check lives in StrongPassword.
 */
export class PasswordHash {
  static readonly REGEX = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/

  readonly value: string

  constructor(hash?: string) {
    this.value = hash ?? ''
    if (!PasswordHash.isValid(this.value)) ValidationError.throwError(Errors.INVALID_PASSWORD_HASH)
  }

  static isValid(hash: string): boolean {
    return PasswordHash.REGEX.test(hash)
  }
}
