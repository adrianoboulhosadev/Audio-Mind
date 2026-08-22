import { UseCase, EventPublisher, NotFoundError, Errors } from 'shared'
import { RecordingRepository } from '../providers'

interface Input {
  recordingId: string
  /** Why it broke, in words the OWNER can act on ("o áudio não tem fala
   * audível"), not a stack trace. `Recording.fail` trims it. */
  reason: string
}

/**
 * System transition (anything but `ready` -> failed). The worker calls this from
 * its catch block, so a failure always leaves a visible state plus an inbox line
 * — the alternative is a recording stuck on "transcribing" forever with the real
 * cause only in a log nobody reads.
 */
export default class FailRecording implements UseCase<Input, void> {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute({ recordingId, reason }: Input): Promise<void> {
    const recording = await this.repository.findById(recordingId)
    if (!recording) NotFoundError.throwError(Errors.RECORDING_NOT_FOUND, recordingId)

    recording.fail(reason)
    await this.repository.update(recording)
    await this.eventPublisher?.publish(recording.pullDomainEvents())
  }
}
