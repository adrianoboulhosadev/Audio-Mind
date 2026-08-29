// Rich entity re-exported as a VALUE: the apps' Prisma repository reconstitutes
// it (`new Transcription({...})`) without importing @transcription/core.
export { Transcription, TranscriptText, TranscriptSegment } from '@transcription/core'
// The pure function that says WHERE a term showed up — the repositories call it
// with the row they just read, so "what counts as a match" stays in the context.
export { findTranscriptMatch } from '@transcription/core'
