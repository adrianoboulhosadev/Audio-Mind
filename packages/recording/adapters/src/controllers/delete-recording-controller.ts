import { DeleteRecording, RecordingRepository } from '@recording/core'

export default class DeleteRecordingController {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(recordingId: string, ownerId: string): Promise<void> {
    await new DeleteRecording(this.repository).execute({ recordingId, ownerId })
  }
}
