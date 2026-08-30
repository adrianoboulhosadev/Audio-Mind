/**
 * READ projection (CQRS) of a share link — what the OWNER sees in their list.
 *
 * The token is in it because the owner has to be able to copy the link again;
 * everything else here answers "should I still be handing this out?".
 */
export interface ShareLinkDTO {
  id: string
  /** The owner's own id. It never leaves the backend on the public side — it is
   * here so the public read can check that the recording still belongs to
   * whoever created the link. */
  ownerId: string
  recordingId: string
  token: string
  includesTranscript: boolean
  includesAudio: boolean
  expiresAt: Date
  revokedAt: Date | null
  viewCount: number
  lastViewedAt: Date | null
  createdAt: Date
}
