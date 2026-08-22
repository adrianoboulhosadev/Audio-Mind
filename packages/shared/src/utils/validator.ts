import { ValidationError } from '../errors/validation-error'

/**
 * GENERIC, reusable validation helpers (that is why they live in shared).
 * Each method returns a ValidationError or null; the caller (a value object,
 * entity or use case) decides when to throw (use `combineErrors` to accumulate
 * several and throw them at once).
 *
 * The context-specific rules (email regex, audio size ceiling…) do NOT live
 * here — they live inside the value object / entity that owns them.
 */
export class Validator {
  static combineErrors(...errors: (ValidationError | null)[]): ValidationError[] | null {
    const filtered = errors.filter((error): error is ValidationError => error !== null)
    return filtered.length > 0 ? filtered : null
  }

  static notNull(value: unknown, error: string): ValidationError | null {
    return value !== null && value !== undefined ? null : ValidationError.create(error, value)
  }

  static notEmpty(value: string | null | undefined, error: string): ValidationError | null {
    if (Validator.notNull(value, error)) return ValidationError.create(error, value)
    return value!.trim() !== '' ? null : ValidationError.create(error, value)
  }

  static minLength(
    value: string | unknown[],
    minimumLength: number,
    error: string,
  ): ValidationError | null {
    return value.length >= minimumLength
      ? null
      : ValidationError.create(error, value, { min: minimumLength })
  }

  /**
   * NOTE: the error carries only the sizes, never the value — echoing a payload
   * that was rejected for being huge is exactly the abuse the limit exists to
   * stop (it would come back in the response and in every log on the way).
   */
  static maxLength(
    value: string | unknown[],
    maximumLength: number,
    error: string,
  ): ValidationError | null {
    return value.length <= maximumLength
      ? null
      : ValidationError.create(error, undefined, { max: maximumLength, length: value.length })
  }

  static matches(value: string, regex: RegExp, error: string): ValidationError | null {
    return regex.test(value) ? null : ValidationError.create(error, value)
  }
}
