import { RetryRecording, RecordingRepository, RecordingProcessingQueue } from '@recording/core'

export default class RetryRecordingController {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly queue?: RecordingProcessingQueue,
  ) {}

  async execute(recordingId: string, ownerId: string): Promise<void> {
    await new RetryRecording(this.repository, this.queue).execute({ recordingId, ownerId })
  }
}
