import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/**
 * Removes the recording for good — this is the user's own audio, and "delete"
 * has to mean delete. Deleting the derived rows (transcript, summary) and the
 * files on disk is CROSS-CONTEXT, so it is orchestrated by the app layer around
 * this call, exactly like every other cross-context flow.
 */
export default class DeleteRecording implements UseCase<Input, void> {
  constructor(private readonly repository: RecordingRepository) {}

  async execute({ recordingId, ownerId }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording || recording.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)
    }

    await this.repository.delete(recordingId)
  }
}
