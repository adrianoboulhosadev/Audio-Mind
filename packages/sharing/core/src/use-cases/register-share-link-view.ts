import { UseCase } from 'shared'
import { ShareLinkRepository } from '../providers'

/**
 * Counts one opening of a link.
 *
 * A COUNT and a timestamp, nothing else: no ip, no user agent, nobody's
 * identity. The owner needs to know a link is being used so they can decide to
 * cut it — turning a share link into a tracker of the people who received it
 * would be collecting personal data none of them agreed to hand over.
 *
 * Silent when the link is gone: this runs after the page was already served, and
 * failing to count a view is never a reason to fail the read.
 */
export default class RegisterShareLinkView implements UseCase<string, void> {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(token: string): Promise<void> {
    const link = await this.repository.findByToken(token)
    if (!link) return

    link.registerView()
    await this.repository.update(link)
  }
}
