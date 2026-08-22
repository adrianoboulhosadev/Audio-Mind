import { UploadRecording, RecordingRepository, RecordingProcessingQueue } from '@recording/core'
import { EventPublisher } from 'shared'
import { UploadRecordingInput } from '../@types'

export default class UploadRecordingController {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly queue?: RecordingProcessingQueue,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(ownerId: string, input: UploadRecordingInput): Promise<void> {
    await new UploadRecording(this.repository, this.queue, this.eventPublisher).execute({
      ownerId,
      ...input,
    })
  }
}
