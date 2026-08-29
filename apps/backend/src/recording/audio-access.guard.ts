import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { Errors } from 'shared'
import { PrismaService } from '../db/prisma.service'
import { verifyAudioAccess } from './audio-access-token'

export interface RequestWithAudioUser extends Request {
  audioUserId: string
}

/**
 * Authenticates the audio stream, which cannot go through the AuthMiddleware:
 * the request is made by the browser's `<audio>` element, which sends no
 * Authorization header. The capability token travels in the query string
 * instead — scoped to one recording and to this purpose only (see
 * audio-access-token).
 *
 * A GUARD and not a check inside the handler, same reasoning as the SSE stream:
 * guards run first, so a bad token answers a clean 401 instead of a half-open
 * response.
 *
 * Two things are verified beyond the signature: the token names THIS recording
 * (a capability for one audio is not a capability for another), and the account
 * still exists and is active — so a deleted account's links die with it.
 */
@Injectable()
export class AudioAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAudioUser>()
    const token = request.query?.token
    if (typeof token !== 'string' || !token) this.refuse()

    const claims = verifyAudioAccess(token as string)
    if (!claims || claims.recordingId !== request.params?.id) this.refuse()

    const user = await this.prisma.user.findUnique({
      where: { id: claims!.userId },
      select: { id: true, active: true },
    })
    if (!user || !user.active) this.refuse()

    request.audioUserId = user!.id
    return true
  }

  private refuse(): never {
    throw new UnauthorizedException({
      statusCode: 401,
      errors: [{ code: Errors.NOT_AUTHENTICATED }],
    })
  }
}
