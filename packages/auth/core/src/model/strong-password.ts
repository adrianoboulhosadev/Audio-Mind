import { ValidationError, Errors } from 'shared'

/**
 * Strong (raw) password value object: enforces the policy — at least 8 chars,
 * one uppercase, one digit and one special character. Validates in the
 * constructor and NEVER carries the raw value into the error (no secret leak).
 * This VO guards the plaintext BEFORE hashing; the stored hash is PasswordHash.
 */
export class StrongPassword {
  static readonly REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
  // bcrypt silently truncates at 72 bytes, so anything longer is not more
  // security — just a bigger payload to hash on every login attempt.
  static readonly MAX_LENGTH = 72

  readonly value: string

  constructor(value?: string) {
    this.value = value ?? ''
    if (!StrongPassword.isValid(this.value)) ValidationError.throwError(Errors.WEAK_PASSWORD)
  }

  static isValid(password: string): boolean {
    return password.length <= StrongPassword.MAX_LENGTH && StrongPassword.REGEX.test(password)
  }
}
