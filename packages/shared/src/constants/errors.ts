/**
 * Domain error codes. Just stable strings — the HTTP layer (adapters/backend)
 * maps each code to a status. Keeps the domain agnostic of HTTP.
 */
export const Errors = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',

  // auth
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_PASSWORD_HASH: 'INVALID_PASSWORD_HASH',
  NAME_TOO_LONG: 'NAME_TOO_LONG',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_EMAIL_OR_PASSWORD: 'INVALID_EMAIL_OR_PASSWORD',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_SAME_AS_PREVIOUS: 'PASSWORD_SAME_AS_PREVIOUS',
  INVALID_SESSION: 'INVALID_SESSION',

  // recording — the audio the user recorded or uploaded
  // Also answered when the recording belongs to SOMEONE ELSE (anti-IDOR): a
  // foreign recording is indistinguishable from a missing one.
  RECORDING_NOT_FOUND: 'RECORDING_NOT_FOUND',
  RECORDING_TITLE_TOO_LONG: 'RECORDING_TITLE_TOO_LONG',
  UNSUPPORTED_AUDIO_FORMAT: 'UNSUPPORTED_AUDIO_FORMAT',
  // Carries the ceiling in `extras.max` because the ceiling is NOT a constant:
  // it depends on who is uploading (see AudioFile.ALLOWANCES).
  AUDIO_TOO_LARGE: 'AUDIO_TOO_LARGE',
  AUDIO_TOO_LONG: 'AUDIO_TOO_LONG',
  INVALID_AUDIO_DURATION: 'INVALID_AUDIO_DURATION',
  AUDIO_FILE_REQUIRED: 'AUDIO_FILE_REQUIRED',
  // The pipeline transition asked for does not exist from the current status
  // (e.g. summarizing something that was never transcribed).
  INVALID_RECORDING_STATUS: 'INVALID_RECORDING_STATUS',
  // Only a FAILED recording can be sent through the pipeline again.
  RECORDING_NOT_FAILED: 'RECORDING_NOT_FAILED',

  // transcription — what the speech-to-text model heard
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  // The model returned nothing usable (silence, an unreadable file).
  EMPTY_TRANSCRIPT: 'EMPTY_TRANSCRIPT',
  TRANSCRIPT_TOO_LONG: 'TRANSCRIPT_TOO_LONG',

  // summary — what the LLM wrote about the transcript (+ its PDF)
  SUMMARY_NOT_FOUND: 'SUMMARY_NOT_FOUND',
  EMPTY_SUMMARY: 'EMPTY_SUMMARY',
  SUMMARY_TEXT_TOO_LONG: 'SUMMARY_TEXT_TOO_LONG',
  // The model came back with a wall of bullets instead of a summary.
  TOO_MANY_SUMMARY_ITEMS: 'TOO_MANY_SUMMARY_ITEMS',
  // The PDF has not been rendered (yet) for this summary.
  PDF_NOT_AVAILABLE: 'PDF_NOT_AVAILABLE',

  // notification
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
} as const

export type ErrorCode = (typeof Errors)[keyof typeof Errors]
