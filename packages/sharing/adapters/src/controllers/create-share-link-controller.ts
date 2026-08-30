import { CreateShareLink, ShareLinkRepository } from '@sharing/core'
import { CreateShareLinkInput } from '../@types'

export default class CreateShareLinkController {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(ownerId: string, recordingId: string, input: CreateShareLinkInput): Promise<void> {
    await new CreateShareLink(this.repository).execute({ ownerId, recordingId, ...input })
  }
}
