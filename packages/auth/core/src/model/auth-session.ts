import { Entity, EntityProps } from 'shared'

export interface AuthSessionProps extends EntityProps {
  userId: string
  verifierHash: string
  expiresAt: Date
}

/**
 * Authentication session = one live refresh token (one per login/device —
 * multi-device: a user may have several). The database stores only the
 * `verifierHash` = bcrypt(sha256(refresh)), so leaking the table does not expose
 * usable tokens. The presence of the row sustains revocation (logout deletes it);
 * rotation updates the hash. The id travels as the `sessionId` refresh claim.
 */
export class AuthSession extends Entity<AuthSession, AuthSessionProps> {
  readonly userId: string
  readonly verifierHash: string
  readonly expiresAt: Date

  constructor(props: AuthSessionProps) {
    super(props)
    this.userId = props.userId
    this.verifierHash = props.verifierHash
    this.expiresAt = props.expiresAt
  }

  isExpired(reference: Date): boolean {
    return this.expiresAt.getTime() <= reference.getTime()
  }
}
