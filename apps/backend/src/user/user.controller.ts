import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { ChangePasswordInput, UpdateProfileInput, UserDTO, UserFacade } from '@auth/adapters'
import { NotificationFacade } from '@notification/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { requireFields } from '../shared/require-fields'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { PrismaAuthSessionRepository } from '../auth/prisma-auth-session-repository'
import { BcryptHashProvider } from '../auth/bcrypt-hash-provider'
import { REFRESH_COOKIE_OPTIONS } from '../auth/refresh-cookie-options'
import { PrismaNotificationRepository } from '../notification/prisma-notification-repository'
import { RecordingEraser } from '../recording/recording-eraser'

/**
 * Everything about the AUTHENTICATED user. Every route here takes its id from
 * `@authenticatedUser` (resolved by the AuthMiddleware from the JWT) — never
 * from the body or the path (anti-IDOR).
 */
@Controller('user')
export class UserController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
    private readonly recordings: RecordingEraser,
    private readonly notificationRepository: PrismaNotificationRepository,
  ) {}

  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      this.userRepository,
      this.hashProvider,
      undefined,
      this.sessionRepository,
    )
  }

  // The middleware already resolved the DTO for this request, so /me is free.
  @Get('me')
  me(@authenticatedUser() user: UserDTO): UserDTO {
    return user
  }

  @Patch('me')
  async updateProfile(@authenticatedUser() user: UserDTO, @Body() input: UpdateProfileInput) {
    await this.facade().updateProfile(user.id, input)
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@authenticatedUser() user: UserDTO, @Body() input: ChangePasswordInput) {
    requireFields(input, ['oldPassword', 'newPassword'])
    await this.facade().changePassword(user.id, input)
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @authenticatedUser() user: UserDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Logs out THIS device: the presented refresh identifies which session dies.
    await this.facade().logoutUser(user.id, request.cookies?.['refreshToken'])
    response.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS)
  }

  /**
   * ERASES the account and everything the person ever put in the app — the
   * LGPD's right to elimination (Lei 13.709/2018, art. 18, VI), which is exactly
   * what the profile screen promises before asking for confirmation. No soft
   * delete: no audio, no transcript, no summary, no PDF, no inbox line, no row.
   *
   * The order is deliberate — derived data first, identity LAST. Erasing the
   * user row first would orphan every recording behind an owner id nobody can
   * resolve; this way a failure halfway leaves an account that still works and
   * can simply try again.
   *
   * Deactivating (active=false) is no longer a route: it stays a hand-run
   * `UPDATE users SET active=false`, like promoting someone to admin. What the
   * product offers its users is erasure.
   */
  @Delete('me')
  async deleteAccount(
    @authenticatedUser() user: UserDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.recordings.eraseAllOwnedBy(user.id)
    await new NotificationFacade(this.notificationRepository).deleteAllNotifications(user.id)
    // Sessions go with it (the use case owns both).
    await this.facade().deleteUser(user.id)
    response.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS)
  }
}
