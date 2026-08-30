import { ShareLinkDTO, ShareLinkQueryRepository, ShareLinkRepository } from '@sharing/core'
import {
  CreateShareLinkController,
  DeleteRecordingShareLinksController,
  GetShareLinkByTokenController,
  ListMyShareLinksController,
  RegisterShareLinkViewController,
  RevokeShareLinkController,
} from '../controllers'
import { CreateShareLinkInput } from '../@types'

/**
 * Single entry point the backend calls — both sides of the feature: the owner's
 * (create, list, revoke) and the public page's (resolve the token, count a
 * view). The worker wires none of it: nothing in the pipeline shares anything.
 */
export default class ShareFacade {
  constructor(
    private readonly repository?: ShareLinkRepository,
    private readonly queryRepository?: ShareLinkQueryRepository,
  ) {}

  /** Answers nothing (CQRS): the screen re-reads the list, where the new link
   * is the first row. */
  async createShareLink(
    ownerId: string,
    recordingId: string,
    input: CreateShareLinkInput,
  ): Promise<void> {
    await new CreateShareLinkController(this.repository!).execute(ownerId, recordingId, input)
  }

  async listMyShareLinks(ownerId: string, recordingId?: string): Promise<ShareLinkDTO[]> {
    return new ListMyShareLinksController(this.queryRepository!).execute(ownerId, recordingId)
  }

  async revokeShareLink(shareLinkId: string, ownerId: string): Promise<void> {
    await new RevokeShareLinkController(this.repository!).execute(shareLinkId, ownerId)
  }

  /** The public page's only authorization. Throws for a token that is unknown,
   * expired or revoked. */
  async getShareLinkByToken(token: string): Promise<ShareLinkDTO> {
    return new GetShareLinkByTokenController(this.queryRepository!).execute(token)
  }

  async registerShareLinkView(token: string): Promise<void> {
    await new RegisterShareLinkViewController(this.repository!).execute(token)
  }

  async deleteRecordingShareLinks(recordingId: string): Promise<void> {
    await new DeleteRecordingShareLinksController(this.repository!).execute(recordingId)
  }
}
