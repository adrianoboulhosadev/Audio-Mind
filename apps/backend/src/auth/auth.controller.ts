import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { UnauthorizedError, Errors } from 'shared'
import { LoginUserInput, RegisterUserInput, UserFacade } from '@auth/adapters'
import { requireFields } from '../shared/require-fields'
import { DomainEventListener } from '../notification/domain-event-listener'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { REFRESH_COOKIE_OPTIONS } from './refresh-cookie-options'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
    private readonly jwtProvider: JsonWebTokenProvider,
    private readonly events: DomainEventListener,
  ) {}

  // Optional ports: each method uses only what it needs (register, login, refresh).
  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      undefined,
      this.hashProvider,
      this.jwtProvider,
      this.sessionRepository,
      this.events,
    )
  }

  /**
   * Creates the account AND opens the session, answering the same
   * `{ accessToken }` + refresh cookie a login does: whoever just proved they
   * own those credentials by choosing them has nothing left to prove, and asking
   * them to type the pair again is a form to fill for no one's benefit.
   *
   * Two commands, orchestrated here rather than merged: registering still
   * returns void (it is a command like any other), and the session is opened by
   * the SAME login use case every other session goes through — so lastLogin, the
   * session family and the token pair all come from one place instead of a
   * second, parallel path that could drift from it.
   *
   * Welcoming the new account is the DomainEventListener's job, off the
   * UserRegistered event the register use case publishes.
   */
  @Post('register')
  async register(@Body() input: RegisterUserInput, @Res({ passthrough: true }) response: Response) {
    requireFields(input, ['email', 'password'])
    await this.facade().registerUser(input)

    const { accessToken, refreshToken } = await this.facade().loginUser({
      email: input.email,
      password: input.password,
    })
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginUserInput, @Res({ passthrough: true }) response: Response) {
    requireFields(input, ['email', 'password'])
    const { accessToken, refreshToken } = await this.facade().loginUser(input)
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const currentToken = request.cookies?.['refreshToken']
    if (!currentToken) UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)

    // Rotation: issue a new pair and update the cookie with the rotated refresh.
    const { accessToken, refreshToken } = await this.facade().refreshToken(
      currentToken,
      process.env.JWT_SECRET!,
    )
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }
}
