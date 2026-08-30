import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AccessDeniedError, Errors } from 'shared'
import { RequestWithUser } from '../auth/auth.middleware'

/**
 * Lets only an administrator through.
 *
 * It reads the identity the AuthMiddleware already resolved (middleware runs
 * before guards), so it never parses a token itself — there is one place where
 * "who is calling" is decided, and this is not it.
 *
 * It throws the DOMAIN error, so the DomainExceptionFilter renders the same
 * `{ statusCode, errors: [{ code }] }` envelope as every other route and the
 * front can tell 403 ADMIN_ONLY from an expired session.
 *
 * Note this answers 403 and not 404, unlike a recording that belongs to somebody
 * else: the admin AREA is not a secret — that it exists is obvious — and hiding
 * it would only make a wrong role look like a broken page.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (request.user?.role !== 'admin') AccessDeniedError.throwError(Errors.ADMIN_ONLY)

    return true
  }
}
