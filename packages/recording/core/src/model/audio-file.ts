import { ValidationError, Errors, Validator } from 'shared'

/**
 * The audio the user recorded or uploaded (value object).
 *
 * The FILE itself never enters the domain — it lives on disk and only its
 * relative path travels here (see the Uploads section of CLAUDE.md). What this
 * VO owns are the rules that make a file processable at all: a format the
 * speech-to-text model accepts, a size the API accepts, and a duration a human
 * would actually wait for.
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

  /** 25 MB — the ceiling of the transcription API itself. Rejecting it here
   * means the user hears about it before the upload, not after the job fails. */
  static readonly MAX_SIZE_BYTES = 25 * 1024 * 1024
  /** 30 minutes. */
  static readonly MAX_DURATION_SECONDS = 30 * 60
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
    if (this.sizeBytes > AudioFile.MAX_SIZE_BYTES) {
      ValidationError.throwError(Errors.AUDIO_TOO_LARGE, undefined, {
        max: AudioFile.MAX_SIZE_BYTES,
        size: this.sizeBytes,
      })
    }
    // A duration of zero is not "a short audio": it is the browser failing to
    // read the metadata, and it would reach the model as an empty file.
    if (!Number.isFinite(this.durationSeconds) || this.durationSeconds <= 0) {
      ValidationError.throwError(Errors.INVALID_AUDIO_DURATION, this.durationSeconds)
    }
    if (this.durationSeconds > AudioFile.MAX_DURATION_SECONDS) {
      ValidationError.throwError(Errors.AUDIO_TOO_LONG, undefined, {
        max: AudioFile.MAX_DURATION_SECONDS,
        duration: this.durationSeconds,
      })
    }
  }

  static isSupported(mimeType: string): boolean {
    return (AudioFile.SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType)
  }

  get megabytes(): number {
    return Math.round((this.sizeBytes / (1024 * 1024)) * 100) / 100
  }
}
