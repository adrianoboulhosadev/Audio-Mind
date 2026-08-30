import { UseCase, NotFoundError, Errors } from 'shared'
import { ShareLinkRepository } from '../providers'

interface Input {
  shareLinkId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/**
 * Cuts a link off now. Someone else's link answers exactly like a missing one.
 *
 * The row is kept rather than deleted: the owner should be able to see that a
 * link existed, was opened N times and was cut off — deleting it would make
 * "revoguei aquele link?" unanswerable.
 */
export default class RevokeShareLink implements UseCase<Input, void> {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute({ shareLinkId, ownerId }: Input): Promise<void> {
    const link = await this.repository.findById(shareLinkId)
    if (!link || link.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.SHARE_LINK_NOT_FOUND, shareLinkId)
    }

    link.revoke()
    await this.repository.update(link)
  }
}
