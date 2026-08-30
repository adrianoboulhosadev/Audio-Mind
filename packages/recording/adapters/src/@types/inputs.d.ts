import type { RecordingKind, RecordingSource } from '@recording/core'

/**
 * The bytes are NOT in this payload: the file goes up first through
 * POST /upload/audios, which answers with its path — the same two-step shape
 * used for every upload in the project. `durationSeconds` is measured in the
 * browser (the server would have to decode the file to learn it).
 *
 * The ownerId does NOT come in the body: it is resolved from the JWT at the HTTP
 * boundary (anti-IDOR).
 */
export interface UploadRecordingInput {
  title: string
  /** Which summary template to use. Absent (or unknown) reads as the generic
   * one — the domain is fail-closed about it. */
  kind?: RecordingKind
  source: RecordingSource
  audioUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
}

export interface RenameRecordingInput {
  title: string
}

export interface ChangeRecordingKindInput {
  kind: RecordingKind
}
