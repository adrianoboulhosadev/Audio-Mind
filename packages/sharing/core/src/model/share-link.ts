import { Entity, EntityProps, Errors, ValidationError } from 'shared'
import { ShareScope } from './share-scope'
import { ShareToken } from './share-token'
import { assertWithinLongestWindow, expirationFor } from './share-window'

export interface ShareLinkProps extends EntityProps {
  /** Logical FK to the user who created it. */
  ownerId?: string
  /** Logical FK to the recording it opens — exactly ONE, always. */
  recordingId?: string
  /** Absent on creation (one is generated), present when reconstituting a row. */
  token?: string
  includesTranscript?: boolean
  includesAudio?: boolean
  expiresAt?: Date
  revokedAt?: Date | null
  viewCount?: number
  lastViewedAt?: Date | null
  createdAt?: Date
}

/**
 * A link that lets someone WITHOUT an account read the summary of one recording
 * (rich entity).
 *
 * Three things are invariants and not settings:
 * - it opens ONE recording, never a library and never a second one;
 * - it EXPIRES, always (see ShareWindow) — there is no eternal link;
 * - it can be REVOKED at any moment, and a revoked link is dead even if it has
 *   not expired.
 *
 * `isUsable` is the single place all three are decided, so no caller can check
 * two of them and forget the third.
 */
export class ShareLink extends Entity<ShareLink, ShareLinkProps> {
  readonly ownerId: string
  readonly recordingId: string
  readonly token: ShareToken
  readonly scope: ShareScope
  readonly expiresAt: Date
  readonly createdAt: Date
  revokedAt: Date | null
  viewCount: number
  lastViewedAt: Date | null

  constructor(props: ShareLinkProps) {
    super(props)
    const ownerId = props.ownerId?.trim() ?? ''
    if (!ownerId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'ownerId')

    const recordingId = props.recordingId?.trim() ?? ''
    if (!recordingId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'recordingId')

    this.ownerId = ownerId
    this.recordingId = recordingId
    this.token = new ShareToken(props.token)
    this.scope = new ShareScope({
      transcript: props.includesTranscript,
      audio: props.includesAudio,
    })
    // No expiry given means a brand-new link, which gets the shortest window —
    // the same fail-closed default the window reader uses.
    this.expiresAt = props.expiresAt ?? expirationFor()
    assertWithinLongestWindow(this.expiresAt)
    this.revokedAt = props.revokedAt ?? null
    this.viewCount = props.viewCount ?? 0
    this.lastViewedAt = props.lastViewedAt ?? null
    this.createdAt = props.createdAt ?? new Date()
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime()
  }

  /** The ONE question the public side asks. */
  isUsable(now: Date = new Date()): boolean {
    return !this.isRevoked && !this.isExpired(now)
  }

  /**
   * Kills the link now. Idempotent — revoking twice keeps the first timestamp,
   * because what the owner wants to know later is when they cut it off.
   *
   * There is no un-revoke: a link that was handed out and taken back is not the
   * same secret any more. Sharing again means a NEW link, with a new token.
   */
  revoke(): void {
    if (this.revokedAt) return
    this.revokedAt = new Date()
  }

  /** Someone opened it. Counted so the owner can see a link is being used (and
   * decide to cut it) — never WHO opened it: this page has no accounts, and
   * turning a share link into a tracker would be collecting personal data
   * nobody agreed to hand over. */
  registerView(): void {
    this.viewCount += 1
    this.lastViewedAt = new Date()
  }
}
