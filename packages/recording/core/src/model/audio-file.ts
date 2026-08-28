import { ValidationError, Errors, Validator } from 'shared'

/**
 * How much audio the CALLER is allowed to hand over. It is not the same for
 * everyone, so it cannot be a constant on the value object:
 *
 * - `standard` — what an ordinary account gets. 25 MB is the ceiling of the
 *   transcription API itself, and 30 minutes is a length a person waits for.
 * - `extended` — what an admin account gets. Size goes to 1 GB and the duration
 *   ceiling drops entirely: an admin uploading a long archive is a deliberate
 *   act by whoever owns the database, not a mistake to guard against.
 *
 * Note this is a RECORDING concept, not an auth one. This context does not know
 * what a role is — the app layer reads the role and picks the allowance, which
 * is what keeps the two contexts from importing each other.
 */
export type AudioAllowance = 'standard' | 'extended'

export interface AudioLimits {
  maxSizeBytes: number
  /** `null` = no ceiling. A duration of ZERO is refused either way — that is
   * broken metadata, not a short audio. */
  maxDurationSeconds: number | null
}

/**
 * The audio the user recorded or uploaded (value object).
 *
 * The FILE itself never enters the domain — it lives on disk and only its
 * relative path travels here (see the Uploads section of CLAUDE.md). What this
 * VO owns are the rules that make a file processable at all: a format the
 * speech-to-text model accepts, a size the caller is allowed to send, and a
 * duration a human would actually wait for.
 *
 * Immutable, and validated in the constructor, so a Recording can never hold an
 * audio the pipeline is guaranteed to choke on.
 */
export class AudioFile {
  /** What the transcription model accepts (flac, mp3, mp4/m4a, ogg, wav, webm).
   * Browsers label the SAME container differently (`audio/x-m4a` vs
   * `audio/mp4`, `audio/vnd.wave` vs `audio/wav`), so the list carries the
   * aliases instead of pretending there is one canonical name per format. */
  static readonly SUPPORTED_MIME_TYPES = [
    'audio/flac',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/vnd.wave',
    'audio/webm',
  ] as const

  static readonly ALLOWANCES: Readonly<Record<AudioAllowance, AudioLimits>> = {
    standard: { maxSizeBytes: 25 * 1024 * 1024, maxDurationSeconds: 30 * 60 },
    extended: { maxSizeBytes: 1024 * 1024 * 1024, maxDurationSeconds: null },
  }

  static readonly MAX_URL_LENGTH = 500

  readonly url: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly durationSeconds: number

  constructor(props: {
    url?: string
    mimeType?: string
    sizeBytes?: number
    durationSeconds?: number
    /**
     * The ceilings to admit this audio UNDER. Present on the way in (the upload
     * use case passes the caller's allowance); ABSENT when a repository
     * reconstitutes a stored row — a recording that was already admitted stays
     * valid even if the ceilings change later, and re-checking would make an
     * admin's old 900 MB file unreadable the day someone edits the table.
     */
    admissionLimits?: AudioLimits
  }) {
    this.url = props.url?.trim() ?? ''
    this.mimeType = props.mimeType?.trim().toLowerCase() ?? ''
    this.sizeBytes = props.sizeBytes ?? 0
    this.durationSeconds = Math.round(props.durationSeconds ?? 0)

    if (!this.url) ValidationError.throwError(Errors.AUDIO_FILE_REQUIRED)
    const tooLongUrl = Validator.maxLength(this.url, AudioFile.MAX_URL_LENGTH, Errors.AUDIO_FILE_REQUIRED)
    if (tooLongUrl) throw tooLongUrl

    if (!AudioFile.isSupported(this.mimeType)) {
      ValidationError.throwError(Errors.UNSUPPORTED_AUDIO_FORMAT, this.mimeType)
    }
    if (!Number.isInteger(this.sizeBytes) || this.sizeBytes <= 0) {
      ValidationError.throwError(Errors.AUDIO_FILE_REQUIRED)
    }
    // A duration of zero is not "a short audio": it is the browser failing to
    // read the metadata, and it would reach the model as an empty file. This one
    // holds on reconstitution too — a zero-duration row is broken, not grandfathered.
    if (!Number.isFinite(this.durationSeconds) || this.durationSeconds <= 0) {
      ValidationError.throwError(Errors.INVALID_AUDIO_DURATION, this.durationSeconds)
    }

    if (props.admissionLimits) this.admit(props.admissionLimits)
  }

  /** The ceilings, checked only on the way in. Never carries the offending
   * value — `max` and the actual are numbers, and that is the whole point of a
   * size limit: not to echo the payload back. */
  private admit(limits: AudioLimits): void {
    if (this.sizeBytes > limits.maxSizeBytes) {
      ValidationError.throwError(Errors.AUDIO_TOO_LARGE, undefined, {
        max: limits.maxSizeBytes,
        size: this.sizeBytes,
      })
    }
    if (limits.maxDurationSeconds !== null && this.durationSeconds > limits.maxDurationSeconds) {
      ValidationError.throwError(Errors.AUDIO_TOO_LONG, undefined, {
        max: limits.maxDurationSeconds,
        duration: this.durationSeconds,
      })
    }
  }

  /** Fail-closed: an allowance nobody recognises (or none at all) gets the tight
   * one. Forgetting to pass it can only ever narrow what is accepted. */
  static limitsFor(allowance?: AudioAllowance | null): AudioLimits {
    return allowance === 'extended' ? AudioFile.ALLOWANCES.extended : AudioFile.ALLOWANCES.standard
  }

  static isSupported(mimeType: string): boolean {
    return (AudioFile.SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType)
  }

  get megabytes(): number {
    return Math.round((this.sizeBytes / (1024 * 1024)) * 100) / 100
  }
}
