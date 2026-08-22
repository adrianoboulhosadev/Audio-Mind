import { Controller, Header, Req, Sse, UseGuards } from '@nestjs/common'
import { Observable } from 'rxjs'
import { LiveUpdates } from './live-updates'
import { StreamAuthGuard, RequestWithStreamUser } from './stream-auth.guard'

/**
 * The live channel that makes polling unnecessary: the browser holds one
 * EventSource open here and the backend pushes a ping whenever THIS user's
 * inbox changes (see LiveUpdates). It matters more here than in a CRUD app —
 * transcribing plus summarizing takes real minutes, and without a push the user
 * would sit refreshing the page to find out whether their audio is done.
 *
 * A separate controller from NotificationController on purpose: the
 * AuthMiddleware is applied per CLASS and reads the Authorization header, which
 * EventSource cannot send — so this class stays out of the middleware and
 * authenticates with StreamAuthGuard instead.
 *
 * Server-Sent Events rather than WebSocket: the traffic only ever flows one way
 * (server → browser), and EventSource reconnects on its own after a drop, which
 * is exactly the behavior wanted here and would otherwise have to be written by
 * hand.
 */
@Controller('notification')
export class NotificationStreamController {
  constructor(private readonly liveUpdates: LiveUpdates) {}

  // Returns the Observable SYNCHRONOUSLY — Nest does not await an @Sse handler
  // (see router-execution-context), so the authentication has to happen in the
  // guard above, not here.
  //
  // X-Accel-Buffering tells Nginx not to buffer THIS response, which is what SSE
  // needs (a buffered stream reaches the browser only once the buffer fills, so
  // the page looks frozen). The belt-and-braces version of the same setting in
  // deploy/nginx.conf, so the stream still works behind a proxy nobody
  // configured for it.
  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  @UseGuards(StreamAuthGuard)
  stream(@Req() request: RequestWithStreamUser): Observable<{ data: string }> {
    return this.liveUpdates.streamFor(request.streamUserId)
  }
}
