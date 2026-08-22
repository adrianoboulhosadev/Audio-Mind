import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
  title: string
}

/** Renames the audio. The length/emptiness rule is RecordingTitle's, applied by
 * `Recording.rename`. Allowed at any status — the title is a label, not part of
 * the pipeline. */
export default class RenameRecording implements UseCase<Input, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute({ recordingId, ownerId, title }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording || recording.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)
    }

    recording.rename(title)
    await this.repository.update(recording)
  }
}
