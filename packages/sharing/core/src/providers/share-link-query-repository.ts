import { ShareLinkDTO } from '../model'

/** Share link READ port (query side of CQRS). */
export interface ShareLinkQueryRepository {
  /** The owner's links, newest first. `recordingId` narrows it to one audio. */
  listByOwnerQuery(ownerId: string, recordingId?: string): Promise<ShareLinkDTO[]>
  findByTokenQuery(token: string): Promise<ShareLinkDTO | null>
}
