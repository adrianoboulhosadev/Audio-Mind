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
  // Reprocessing is refused while a job is already on this recording (queued or
  // running) — a second one would have two workers writing the same rows.
  RECORDING_IN_PIPELINE: 'RECORDING_IN_PIPELINE',

  // transcription — what the speech-to-text model heard
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  // The model returned nothing usable (silence, an unreadable file).
  EMPTY_TRANSCRIPT: 'EMPTY_TRANSCRIPT',
  TRANSCRIPT_TOO_LONG: 'TRANSCRIPT_TOO_LONG',
  // One segment (a stretch of speech with its timestamps) came back unusable.
  // Never fatal on its own: the entity drops it and keeps the transcript.
  INVALID_TRANSCRIPT_SEGMENT: 'INVALID_TRANSCRIPT_SEGMENT',

  // summary — what the LLM wrote about the transcript (+ its PDF)
  SUMMARY_NOT_FOUND: 'SUMMARY_NOT_FOUND',
  EMPTY_SUMMARY: 'EMPTY_SUMMARY',
  SUMMARY_TEXT_TOO_LONG: 'SUMMARY_TEXT_TOO_LONG',
  // The model came back with a wall of bullets instead of a summary.
  TOO_MANY_SUMMARY_ITEMS: 'TOO_MANY_SUMMARY_ITEMS',
  // The PDF has not been rendered (yet) for this summary.
  PDF_NOT_AVAILABLE: 'PDF_NOT_AVAILABLE',
  // Asking something about a recording: the question itself, and the answer.
  EMPTY_QUESTION: 'EMPTY_QUESTION',
  QUESTION_TOO_LONG: 'QUESTION_TOO_LONG',
  EMPTY_ANSWER: 'EMPTY_ANSWER',

  // annotation — a mark (and maybe a note) at one second of a recording
  ANNOTATION_NOT_FOUND: 'ANNOTATION_NOT_FOUND',
  INVALID_ANNOTATION_TIME: 'INVALID_ANNOTATION_TIME',
  ANNOTATION_NOTE_TOO_LONG: 'ANNOTATION_NOTE_TOO_LONG',

  // sharing — a public link to ONE recording's summary
  SHARE_LINK_NOT_FOUND: 'SHARE_LINK_NOT_FOUND',
  // Only ever answered to somebody who already holds a valid token: being told
  // WHY it stopped working saves them from concluding the app is broken.
  SHARE_LINK_EXPIRED: 'SHARE_LINK_EXPIRED',
  SHARE_LINK_REVOKED: 'SHARE_LINK_REVOKED',
  INVALID_SHARE_TOKEN: 'INVALID_SHARE_TOKEN',
  INVALID_SHARE_EXPIRATION: 'INVALID_SHARE_EXPIRATION',

  // task — an action item promoted out of a summary, with a life of its own
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  EMPTY_TASK: 'EMPTY_TASK',
  TASK_TEXT_TOO_LONG: 'TASK_TEXT_TOO_LONG',

  // notification
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
} as const

export type ErrorCode = (typeof Errors)[keyof typeof Errors]
