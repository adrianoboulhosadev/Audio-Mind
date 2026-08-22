import { UseCase, UnauthorizedError, Errors } from 'shared'
import { AuthSession, calculateRefreshExpiration } from '../model'
import {
  JwtProvider,
  JwtTokens,
  JwtPayload,
  AuthSessionRepository,
  HashProvider,
  UserRepository,
} from '../providers'

export interface Input {
  token: string
}

/**
 * Stateful refresh with ROTATION and REUSE DETECTION:
 * - verifies the refresh signature to obtain {userId, sessionId};
 * - finds the session (family) by id and checks the token against the current
 *   hash (bcrypt);
 * - authentic signature + existing family but a token that does NOT match the
 *   current hash = an already-rotated refresh being replayed (likely theft) ->
 *   deletes the family and denies;
 * - otherwise (current token) it ROTATES: issues a new pair with the SAME
 *   sessionId and updates the session hash. Other devices are not affected.
 */
export default class RefreshToken implements UseCase<Input, JwtTokens> {
  constructor(
    private readonly jwt: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hash: HashProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ token }: Input, secret: string): Promise<JwtTokens> {
    const payload = this.verify(token, secret)
    if (!payload.sessionId) UnauthorizedError.throwError(Errors.INVALID_SESSION)

    const session = await this.sessionRepository.findById(payload.sessionId)
    if (!session || session.userId !== payload.userId) {
      UnauthorizedError.throwError(Errors.INVALID_SESSION)
    }

    // Authentic token + existing family, but it is not the current refresh =>
    // reuse of an already-rotated token => tears down the whole family.
    if (!this.hash.compareToken(token, session.verifierHash)) {
      await this.sessionRepository.delete(session.id.value)
      UnauthorizedError.throwError(Errors.INVALID_SESSION)
    }

    // A deactivated account cannot renew itself, even holding a valid refresh.
    const user = await this.userRepository.findById(session.userId)
    if (!user || !user.active) UnauthorizedError.throwError(Errors.INVALID_SESSION)

    // Rotation: new pair with the SAME sessionId; the session now stores the new hash.
    const newPayload: JwtPayload = {
      userId: user.id.value,
      email: user.email.value,
      sessionId: session.id.value,
    }
    const tokens = this.jwt.generateTokens(newPayload)

    await this.sessionRepository.update(
      new AuthSession({
        id: session.id.value,
        userId: session.userId,
        verifierHash: this.hash.hashToken(tokens.refreshToken),
        expiresAt: calculateRefreshExpiration(),
      }),
    )

    return tokens
  }

  private verify(token: string, secret: string): JwtPayload {
    try {
      return this.jwt.verifyToken(token, secret) as JwtPayload
    } catch {
      UnauthorizedError.throwError(Errors.INVALID_SESSION)
    }
  }
}
