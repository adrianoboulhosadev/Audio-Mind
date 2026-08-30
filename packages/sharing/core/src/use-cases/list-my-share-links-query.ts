import { UseCase } from 'shared'
import { ShareLinkDTO } from '../model'
import { ShareLinkQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary. */
  ownerId: string
  recordingId?: string
}

/**
 * The links this person has handed out. Revoking is only a real promise if there
 * is somewhere to SEE what is out there — a "compartilhar" button with no list
 * behind it means the only way to know what you shared is to remember it.
 */
export default class ListMyShareLinksQuery implements UseCase<Input, ShareLinkDTO[]> {
  constructor(private readonly queryRepository: ShareLinkQueryRepository) {}

  async execute({ ownerId, recordingId }: Input): Promise<ShareLinkDTO[]> {
    return this.queryRepository.listByOwnerQuery(ownerId, recordingId)
  }
}
