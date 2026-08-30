import { ValidationError, Errors } from 'shared'

/**
 * The second of the recording a mark points at.
 *
 * A whole number of seconds, never negative. It is NOT checked against the
 * recording's duration — this context does not know the recording, and a mark
 * that ended up past the end is a harmless one nobody will click, whereas
 * teaching this context about durations would mean it importing another.
 *
 * The upper bound is a sanity bound for the column (an int), not a product rule:
 * it exists so a crafted request cannot store a number that is not a time.
 */
export class AnnotationTime {
  /** ~11 days. Longer than any audio this app accepts, by a wide margin. */
  static readonly MAX_SECONDS = 999_999

  readonly value: number

  constructor(seconds?: number) {
    const rounded = Math.floor(Number(seconds))

    const invalid =
      !Number.isFinite(rounded) || rounded < 0 || rounded > AnnotationTime.MAX_SECONDS
    if (invalid) ValidationError.throwError(Errors.INVALID_ANNOTATION_TIME, seconds)

    this.value = rounded
  }
}
