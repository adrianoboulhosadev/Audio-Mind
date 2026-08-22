import { UseCase } from 'shared'
import { AuthSessionRepository, HashProvider } from '../providers'

interface Input {
  userId: string
  refreshToken?: string
}

/**
 * Real logout: deletes the session of the presented refresh (this device),
 * finding among the user's active sessions the one that matches the token
 * (bcrypt). Idempotent — with no refresh or no matching session it does nothing
 * and does not fail. The other sessions (other devices) stay valid.
 */
export default class LogoutUser implements UseCase<Input, void> {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hash: HashProvider,
  ) {}

  async execute({ userId, refreshToken }: Input): Promise<void> {
    if (!refreshToken) return

    const sessions = await this.sessionRepository.findActiveByUser(userId)
    const session = sessions.find((current) =>
      this.hash.compareToken(refreshToken, current.verifierHash),
    )
    if (session) await this.sessionRepository.delete(session.id.value)
  }
}
