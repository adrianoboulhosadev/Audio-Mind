import { GetShareLinkByTokenQuery, ShareLinkDTO, ShareLinkQueryRepository } from '@sharing/core'

export default class GetShareLinkByTokenController {
  constructor(private readonly queryRepository: ShareLinkQueryRepository) {}

  async execute(token: string): Promise<ShareLinkDTO> {
    return new GetShareLinkByTokenQuery(this.queryRepository).execute(token)
  }
}
