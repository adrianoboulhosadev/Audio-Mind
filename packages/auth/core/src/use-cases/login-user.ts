import { UseCase, UnauthorizedError, Errors, Id } from 'shared'
import { AuthSession, calculateRefreshExpiration } from '../model'
import {
  UserRepository,
  HashProvider,
  JwtProvider,
  JwtTokens,
  JwtPayload,
  AuthSessionRepository,
} from '../providers'

interface Input {
  email: string
  password: string
}

export default class LoginUser implements UseCase<Input, JwtTokens> {
  constructor(
    private readonly repository: UserRepository,
    private readonly hash: HashProvider,
    private readonly jwt: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(input: Input): Promise<JwtTokens> {
    const email = input.email?.trim().toLowerCase() ?? ''
    const password = input.password ?? ''

    const user = await this.repository.findByEmail(email)

    // Generic error for nonexistent email OR wrong password (does not leak which
    // one). An oversized input takes the same path instead of a specific "too
    // long", which would be an oracle.
    if (!user) UnauthorizedError.throwError(Errors.INVALID_EMAIL_OR_PASSWORD)
    if (!user.password || !this.hash.compare(password, user.password.value)) {
      UnauthorizedError.throwError(Errors.INVALID_EMAIL_OR_PASSWORD)
    }
    // Inactive user is treated as invalid credentials (does not reveal account state).
    if (!user.active) UnauthorizedError.throwError(Errors.INVALID_EMAIL_OR_PASSWORD)

    await this.repository.updateLastLogin(user.id.value)

    // sessionId goes as a signed claim in the refresh -> identifies the family on rotation.
    const sessionId = Id.create()
    const payload: JwtPayload = {
      userId: user.id.value,
      email: user.email.value,
      sessionId,
    }
    const tokens = this.jwt.generateTokens(payload)

    // Multi-device session: stores the hash of the current refresh (bcrypt(sha256)).
    const session = new AuthSession({
      id: sessionId,
      userId: user.id.value,
      verifierHash: this.hash.hashToken(tokens.refreshToken),
      expiresAt: calculateRefreshExpiration(),
    })
    await this.sessionRepository.save(session)

    return tokens
  }
}
