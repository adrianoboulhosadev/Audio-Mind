import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingProcessingQueue, RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/**
 * Sends a FAILED recording through the pipeline again. Nothing was thrown away
 * when it failed — the audio file is still on disk — so a retry is the same job
 * on the same bytes, not a re-upload. `Recording.retry()` is what refuses to
 * re-run anything that did not actually fail.
 */
export default class RetryRecording implements UseCase<Input, void> {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly queue?: RecordingProcessingQueue,
  ) {}

  async execute({ recordingId, ownerId }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording || recording.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)
    }

    recording.retry()
    await this.repository.update(recording)
    await this.queue?.enqueue(recording.id.value)
  }
}
