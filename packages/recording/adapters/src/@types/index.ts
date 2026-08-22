import type { UploadRecordingInput, RenameRecordingInput } from './inputs'
import type { RecordingSource, RecordingStatus } from '@recording/core'
import { AudioFile, RECORDING_SOURCES } from '@recording/core'

export type { UploadRecordingInput, RenameRecordingInput, RecordingSource, RecordingStatus }
// Re-exported as VALUES: the backend's upload controller and the front's picker
// both need the real limits (mime list, 25 MB, 30 min) — duplicating them would
// mean two places to update and a UI that promises what the domain refuses.
export { AudioFile, RECORDING_SOURCES }
