import { ValidationError, Errors } from 'shared'

/**
 * Rejects a malformed request body AT THE EDGE, before anything else runs.
 * Without it an absent field flows straight into Prisma (findById(undefined))
 * and surfaces as an opaque 500/UNKNOWN_ERROR instead of the 400 the client can
 * actually act on. Throws the ValidationError LIST that the
 * DomainExceptionFilter already understands (same shape as
 * Validator.combineErrors), so every missing field is reported at once.
 *
 * This is a presence check only — the real rules stay in the value objects and
 * entities that own them.
 */
export function requireFields<T extends object>(
  input: T | undefined,
  // Keys of the DTO itself, so a renamed field breaks the build instead of
  // silently checking a name that no longer exists.
  fields: (keyof T & string)[],
): void {
  const body = input as Record<string, unknown> | undefined
  const missing = fields.filter((field) => body?.[field] === undefined || body?.[field] === null)
  if (missing.length === 0) return
  throw missing.map((field) => ValidationError.create(Errors.REQUIRED_FIELD, field))
}
