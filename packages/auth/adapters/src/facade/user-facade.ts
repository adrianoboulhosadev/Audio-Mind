import {
  UserRepository,
  UserQueryRepository,
  HashProvider,
  JwtProvider,
  JwtTokens,
  UserDTO,
  UserStatsDTO,
  AuthSessionRepository,
} from '@auth/core'
import { EventPublisher } from 'shared'
import {
  RegisterUserController,
  LoginUserController,
  RefreshTokenController,
  LogoutUserController,
  ChangePasswordController,
  DeleteUserController,
  GetUserStatsController,
  ListUsersController,
  SetUserAccessController,
  FindUserByIdController,
  UpdateProfileController,
} from '../controllers'
import {
  RegisterUserInput,
  LoginUserInput,
  ChangePasswordInput,
  UpdateProfileInput,
  SetUserAccessInput,
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

  async deleteUser(userId: string): Promise<void> {
    await new DeleteUserController(this.userRepository!, this.sessionRepository!).execute(userId)
  }

  /**
   * ADMIN: changes somebody else's role or whether they can log in. Never the
   * caller's own account, and never the erasure path — see SetUserAccess.
   */
  async setUserAccess(actorId: string, userId: string, input: SetUserAccessInput): Promise<void> {
    await new SetUserAccessController(this.userRepository!, this.sessionRepository).execute(
      actorId,
      userId,
      input,
    )
  }

  /** ADMIN: every account, capped and optionally filtered by name/e-mail. */
  async listUsers(term?: string, limit?: number): Promise<UserDTO[]> {
    return new ListUsersController(this.userQueryRepository!).execute(term, limit)
  }

  /** ADMIN: totals of the user base. */
  async getUserStats(): Promise<UserStatsDTO> {
    return new GetUserStatsController(this.userQueryRepository!).execute()
  }

  async findUserById(id: string): Promise<UserDTO> {
    return new FindUserByIdController(this.userQueryRepository!).execute(id)
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    await new UpdateProfileController(this.userRepository!).execute(userId, input)
  }
}
