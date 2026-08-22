import { HashProvider } from '../../src'

/**
 * Deterministic fake — NOT secure, only for testing the core (no bcrypt/sha256).
 * Produces a bcrypt-SHAPED string (`$2a$12$` + 53 chars over bcrypt's alphabet)
 * so the PasswordHash value object accepts it, and round-trips by equality:
 * `compare` re-derives the hash and checks equality. The same scheme is used for
 * tokens.
 */
export default class HashProviderInMemory implements HashProvider {
  private static readonly ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./'

  private encode(value: string): string {
    const alphabet = HashProviderInMemory.ALPHABET
    let accumulator = 7
    for (let index = 0; index < value.length; index++) {
      accumulator = (accumulator * 131 + value.charCodeAt(index)) >>> 0
    }
    let output = ''
    for (let position = 0; position < 53; position++) {
      accumulator = (accumulator * 1103515245 + 12345 + position) >>> 0
      output += alphabet[accumulator % alphabet.length]
    }
    return output
  }

  hash(value: string): string {
    return '$2a$12$' + this.encode(value)
  }

  compare(value: string, hashedValue: string): boolean {
    return hashedValue === this.hash(value)
  }

  hashToken(token: string): string {
    return this.hash(token)
  }

  compareToken(token: string, hashedToken: string): boolean {
    return this.compare(token, hashedToken)
  }
}
