import { RecordingKind } from './recording-kind'
import { RecordingSource, RecordingStatus } from './recording'

/**
 * READ projection (CQRS) of one recording. Plain interface built straight from
 * the query — no entity, no value objects. It is what the list and the detail
 * screen render, so it carries the file facts (size/duration/format) the player
 * needs and the pipeline status the UI shows.
 */
export interface RecordingDTO {
  id: string
  ownerId: string
  title: string
  kind: RecordingKind
  source: RecordingSource
  audioUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
  status: RecordingStatus
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}
