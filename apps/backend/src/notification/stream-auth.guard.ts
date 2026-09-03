import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { JwtPayload } from '@auth/adapters'
import { Errors } from 'shared'
import { PrismaService } from '../db/prisma.service'
import { verifyAccessToken } from '../auth/verify-access-token'

export interface RequestWithStreamUser extends Request {
  streamUserId: string
}

/**
 * Authenticates the SSE stream, which cannot go through the AuthMiddleware: the
 * browser's EventSource sends no custom headers, so the token cannot travel in
 * `Authorization` — it goes in the query string instead, the standard
 * workaround for SSE. Acceptable here because it is the SAME short-lived
 * (15 min) access token that already circulates, sent straight to our own
 * backend over the same connection as every other request.
 *
 * A GUARD and not something inside the handler on purpose: guards run BEFORE
 * the handler, so a bad token answers a clean 401 instead of opening a stream
 * that immediately errors (an @Sse handler must return its Observable
 * synchronously — Nest does not await it).
 *
 * Mirrors the AuthMiddleware's two checks: verify the JWT, then RE-READ the
 * account, so a deactivated one cannot keep a stream alive on a token issued
 * before it was deactivated.
 */
@Injectable()
export class StreamAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithStreamUser>()
    const token = request.query?.token

    if (typeof token !== 'string' || !token) this.refuse()

    // The same check the AuthMiddleware makes, from the same function: a query
    // string is an easier place to leak a token from, so this door must not be
    // the laxer of the two. Only an `access` token opens a stream.
    const payload: JwtPayload | null = verifyAccessToken(token as string)
    if (!payload) this.refuse()

    const user = await this.prisma.user.findUnique({
      where: { id: payload!.userId },
      select: { id: true, active: true },
    })
    if (!user || !user.active) this.refuse()

    request.streamUserId = user!.id
    return true
  }

  private refuse(): never {
    throw new UnauthorizedException({
      statusCode: 401,
      errors: [{ code: Errors.NOT_AUTHENTICATED }],
    })
  }
}
