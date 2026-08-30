import { UseCase, NotFoundError, Errors } from 'shared'
import { ShareLinkDTO } from '../model'
import { ShareLinkQueryRepository } from '../providers'

/**
 * Resolves the secret in the URL — the ONLY authorization the public page has.
 *
 * The three answers are deliberately different, and none of them leaks anything:
 * only somebody who already holds a valid token can ever see "expirou" or "o
 * dono revogou", and being told which one it is saves them from concluding the
 * app is broken. A token that simply does not exist (someone guessing) always
 * gets the same "não encontrado".
 */
export default class GetShareLinkByTokenQuery implements UseCase<string, ShareLinkDTO> {
  constructor(private readonly queryRepository: ShareLinkQueryRepository) {}

  async execute(token: string): Promise<ShareLinkDTO> {
    const link = await this.queryRepository.findByTokenQuery(token?.trim() ?? '')
    if (!link) NotFoundError.throwError(Errors.SHARE_LINK_NOT_FOUND)

    if (link.revokedAt) NotFoundError.throwError(Errors.SHARE_LINK_REVOKED)
    if (link.expiresAt.getTime() <= Date.now()) {
      NotFoundError.throwError(Errors.SHARE_LINK_EXPIRED)
    }

    return link
  }
}
