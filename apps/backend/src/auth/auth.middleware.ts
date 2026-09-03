import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { UserDTO } from '@auth/adapters'
import { UnauthorizedError, Errors } from 'shared'
import { PrismaUserRepository } from './prisma-user-repository'
import { verifyAccessToken } from './verify-access-token'

export interface RequestWithUser extends Request {
  user: UserDTO
}

/**
 * Validates the access token (Bearer), resolves the UserDTO and attaches it to
 * the request. It is the edge where the authenticated identity is established —
 * the protected controllers read `req.user` via @authenticatedUser, and every
 * ownership check downstream uses THAT id, never one from the body or the route
 * (anti-IDOR).
 *
 * "Valid signature" is NOT the check: every token this app signs shares one
 * secret, so verifyAccessToken also demands the `type: 'access'` claim. Without
 * it this door accepted the 7-day refresh cookie and the audio capability token
 * (which rides in a query string) as full session credentials.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)

      const payload = verifyAccessToken(token!)
      if (!payload) UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)

      // Re-read on every request, so deactivating an account cuts it off
      // immediately instead of leaving the issued 15min access token usable.
      const user = await this.userRepository.findByIdQuery(payload!.userId)
      if (!user || !user.active) UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)

      ;(req as RequestWithUser).user = user
    } catch {
      // Every failure (missing/expired/tampered token, unknown user) answers the
      // SAME typed error, so the DomainExceptionFilter renders the standard
      // { statusCode, errors: [{ code }] } envelope like the rest of the API.
      UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)
    }
    next()
  }
}
