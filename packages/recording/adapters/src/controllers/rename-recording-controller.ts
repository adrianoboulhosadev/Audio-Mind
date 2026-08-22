import { RenameRecording, RecordingRepository } from '@recording/core'
import { RenameRecordingInput } from '../@types'

export default class RenameRecordingController {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(recordingId: string, ownerId: string, input: RenameRecordingInput): Promise<void> {
    await new RenameRecording(this.repository).execute({ recordingId, ownerId, ...input })
  }
}
