import { ListMyShareLinksQuery, ShareLinkDTO, ShareLinkQueryRepository } from '@sharing/core'

export default class ListMyShareLinksController {
  constructor(private readonly queryRepository: ShareLinkQueryRepository) {}

  async execute(ownerId: string, recordingId?: string): Promise<ShareLinkDTO[]> {
    return new ListMyShareLinksQuery(this.queryRepository).execute({ ownerId, recordingId })
  }
}
