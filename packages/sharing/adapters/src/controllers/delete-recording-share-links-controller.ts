import { DeleteRecordingShareLinks, ShareLinkRepository } from '@sharing/core'

export default class DeleteRecordingShareLinksController {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(recordingId: string): Promise<void> {
    await new DeleteRecordingShareLinks(this.repository).execute(recordingId)
  }
}
