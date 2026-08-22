import {
  RefreshToken,
  JwtProvider,
  JwtTokens,
  AuthSessionRepository,
  HashProvider,
  UserRepository,
} from '@auth/core'

export default class RefreshTokenController {
  constructor(
    private readonly jwtProvider: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hashProvider: HashProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(token: string, secret: string): Promise<JwtTokens> {
    return new RefreshToken(
      this.jwtProvider,
      this.sessionRepository,
      this.hashProvider,
      this.userRepository,
    ).execute({ token }, secret)
  }
}
