import {
  AudioAllowance,
  RecordingProcessingQueue,
  RecordingRepository,
  UploadRecording,
} from '@recording/core'
import { EventPublisher } from 'shared'
import { UploadRecordingInput } from '../@types'

export default class UploadRecordingController {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly queue?: RecordingProcessingQueue,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  /** `allowance` travels beside `ownerId`, not inside `input`: both are read
   * from the authenticated caller, and a client that could name its own
   * allowance would just name the biggest one. */
  async execute(
    ownerId: string,
    allowance: AudioAllowance,
    input: UploadRecordingInput,
  ): Promise<void> {
    await new UploadRecording(this.repository, this.queue, this.eventPublisher).execute({
      ownerId,
      allowance,
      ...input,
    })
  }
}
