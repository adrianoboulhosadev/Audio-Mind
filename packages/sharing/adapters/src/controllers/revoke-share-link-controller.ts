import { RevokeShareLink, ShareLinkRepository } from '@sharing/core'

export default class RevokeShareLinkController {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(shareLinkId: string, ownerId: string): Promise<void> {
    await new RevokeShareLink(this.repository).execute({ shareLinkId, ownerId })
  }
}
