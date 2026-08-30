import { ShareLink } from '../model'

/** Share link WRITE port (command side of CQRS). */
export interface ShareLinkRepository {
  create(link: ShareLink): Promise<void>
  findById(id: string): Promise<ShareLink | null>
  findByToken(token: string): Promise<ShareLink | null>
  update(link: ShareLink): Promise<void>
  /** Every link that opens this recording — part of the app layer's delete
   * cascade. A link to a recording that no longer exists must not outlive it. */
  deleteByRecording(recordingId: string): Promise<void>
}
