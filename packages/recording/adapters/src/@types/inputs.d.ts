import type { RecordingSource } from '@recording/core'

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
  source: RecordingSource
  audioUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
}

export interface RenameRecordingInput {
  title: string
}
