import { UseCase } from 'shared'
import { ShareLinkRepository } from '../providers'

/**
 * Drops every link that opens a recording. Idempotent, and part of the app
 * layer's delete cascade — an audio that no longer exists must not leave a live
 * URL behind, which is the one place in this context where deleting the row IS
 * the right answer.
 */
export default class DeleteRecordingShareLinks implements UseCase<string, void> {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(recordingId: string): Promise<void> {
    await this.repository.deleteByRecording(recordingId)
  }
}
