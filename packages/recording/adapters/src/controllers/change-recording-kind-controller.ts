import { ChangeRecordingKind, RecordingRepository } from '@recording/core'
import { ChangeRecordingKindInput } from '../@types'

export default class ChangeRecordingKindController {
  constructor(private readonly repository: RecordingRepository) {}

  async execute(
    recordingId: string,
    ownerId: string,
    input: ChangeRecordingKindInput,
  ): Promise<void> {
    await new ChangeRecordingKind(this.repository).execute({ recordingId, ownerId, ...input })
  }
}
