import { UseCase, NotFoundError, Errors } from 'shared'
import { RecordingProcessingQueue, RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/**
 * Sends a recording through the pipeline again — the same job on the same
 * bytes, not a re-upload: the audio file never left the disk. It works on a
 * FAILED recording (the obvious case) and on a READY one (to get what the
 * current pipeline produces and the old run did not).
 *
 * `Recording.retry()` owns the rule: what is refused is a recording a job is
 * already on.
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
