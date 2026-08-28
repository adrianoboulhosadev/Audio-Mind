import type { UploadRecordingInput, RenameRecordingInput } from './inputs'
import type { AudioAllowance, AudioLimits, RecordingSource, RecordingStatus } from '@recording/core'
import { AudioFile, RECORDING_SOURCES } from '@recording/core'

export type {
  UploadRecordingInput,
  RenameRecordingInput,
  RecordingSource,
  RecordingStatus,
  AudioAllowance,
  AudioLimits,
}
// Re-exported as VALUES: the backend's upload controller and the front's picker
// both need the real limits (mime list, and the ceilings of each allowance) —
// duplicating them would mean two places to update and a UI that promises what
// the domain refuses.
export { AudioFile, RECORDING_SOURCES }
