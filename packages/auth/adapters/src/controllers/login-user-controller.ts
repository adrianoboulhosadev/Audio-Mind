import {
  LoginUser,
  UserRepository,
  HashProvider,
  JwtProvider,
  JwtTokens,
  AuthSessionRepository,
} from '@auth/core'
import { LoginUserInput } from '../@types'

export default class LoginUserController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider,
    private readonly jwtProvider: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(input: LoginUserInput): Promise<JwtTokens> {
    return new LoginUser(
      this.userRepository,
      this.hashProvider,
      this.jwtProvider,
      this.sessionRepository,
    ).execute(input)
  }
}
