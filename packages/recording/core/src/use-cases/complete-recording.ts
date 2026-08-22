import { UseCase, EventPublisher, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

/**
 * System transition (summarizing -> ready) — the end of the pipeline. Publishes
 * whatever the entity recorded (RecordingReady) AFTER persisting, so nobody is
 * told the audio is done before the row says so.
 */
export default class CompleteRecording implements UseCase<string, void> {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(recordingId: string): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    recording.markAsReady()
    await this.repository.update(recording)
    await this.eventPublisher?.publish(recording.pullDomainEvents())
  }
}
