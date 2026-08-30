import type {
  UploadRecordingInput,
  RenameRecordingInput,
  ChangeRecordingKindInput,
} from './inputs'
import type {
  AudioAllowance,
  AudioLimits,
  RecordingKind,
  RecordingSource,
  RecordingStatus,
} from '@recording/core'
import { AudioFile, RECORDING_KINDS, RECORDING_SOURCES, toRecordingKind } from '@recording/core'

export type {
  UploadRecordingInput,
  RenameRecordingInput,
  ChangeRecordingKindInput,
  RecordingKind,
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
// The kinds travel as a VALUE too: the composer builds its picker from this
// list, and `toRecordingKind` is what makes the backend read an unknown one as
// the generic template instead of trusting the string.
export { RECORDING_KINDS, toRecordingKind }
