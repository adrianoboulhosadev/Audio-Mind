import {
  UserRepository,
  UserQueryRepository,
  HashProvider,
  JwtProvider,
  JwtTokens,
  UserDTO,
  AuthSessionRepository,
} from '@auth/core'
import { EventPublisher } from 'shared'
import {
  RegisterUserController,
  LoginUserController,
  RefreshTokenController,
  LogoutUserController,
  ChangePasswordController,
  DeactivateUserController,
  FindUserByIdController,
  UpdateProfileController,
} from '../controllers'
import {
  RegisterUserInput,
  LoginUserInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '../@types'

/**
 * Single entry point that the backend (NestJS) calls. Receives the driven
 * adapters through the constructor (optional ports) and delegates to each
 * controller. The backend only knows this facade — never the use cases or the
 * core directly.
 */
export default class UserFacade {
  constructor(
    private readonly userRepository?: UserRepository,
    private readonly userQueryRepository?: UserQueryRepository,
    private readonly hashProvider?: HashProvider,
    private readonly jwtProvider?: JwtProvider,
    private readonly sessionRepository?: AuthSessionRepository,
    // Domain events raised by sign-up (see @auth/core's events): the app turns
    // them into a welcome notification.
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async registerUser(input: RegisterUserInput): Promise<void> {
    await new RegisterUserController(
      this.userRepository!,
      this.hashProvider!,
      this.eventPublisher,
    ).execute(input)
  }

  async loginUser(input: LoginUserInput): Promise<JwtTokens> {
    return new LoginUserController(
      this.userRepository!,
      this.hashProvider!,
      this.jwtProvider!,
      this.sessionRepository!,
    ).execute(input)
  }

  async refreshToken(token: string, secret: string): Promise<JwtTokens> {
    return new RefreshTokenController(
      this.jwtProvider!,
      this.sessionRepository!,
      this.hashProvider!,
      this.userRepository!,
    ).execute(token, secret)
  }

  async logoutUser(userId: string, refreshToken?: string): Promise<void> {
    await new LogoutUserController(this.sessionRepository!, this.hashProvider!).execute(
      userId,
      refreshToken,
    )
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    await new ChangePasswordController(this.userRepository!, this.hashProvider!).execute(userId, input)
  }

  async deactivateUser(userId: string): Promise<void> {
    await new DeactivateUserController(this.userRepository!, this.sessionRepository!).execute(userId)
  }

  async findUserById(id: string): Promise<UserDTO> {
    return new FindUserByIdController(this.userQueryRepository!).execute(id)
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    await new UpdateProfileController(this.userRepository!).execute(userId, input)
  }
}
