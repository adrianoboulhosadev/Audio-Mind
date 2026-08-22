import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Observable } from 'rxjs'
import IORedis from 'ioredis'

/** One channel per recipient, so a subscriber only ever receives its OWN pings
 * — no filtering on the client and no chance of leaking one user's activity to
 * another's connection. The literal must match the worker's publisher. */
export function channelFor(userId: string): string {
  return `notifications-${userId}`
}

export const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

/**
 * Pushes "your inbox changed" to whichever backend instance is holding that
 * user's SSE connection. Redis (already here for BullMQ) is what makes this
 * work with more than one instance — an in-memory emitter would only ever reach
 * clients connected to the same process, and here the PUBLISHER is usually the
 * worker, a different process entirely.
 *
 * The payload is deliberately EMPTY of meaning: the client just re-reads
 * /notification. Pushing the content instead would mean duplicating the read
 * model over two transports and keeping them in sync.
 *
 * Publishing needs its OWN connection: a connection in subscribe mode (see the
 * SSE route) refuses regular commands.
 */
@Injectable()
export class LiveUpdates implements OnModuleDestroy {
  private readonly logger = new Logger(LiveUpdates.name)
  private readonly publisher = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

  /** Best-effort: the notification is already safe in the database, so a failed
   * ping only costs the live refresh (the client still sees it on its next
   * read), never the notification itself. */
  async notifyUser(userId: string): Promise<void> {
    try {
      await this.publisher.publish(channelFor(userId), '1')
    } catch (error) {
      this.logger.warn(`failed to push a live update to ${userId}: ${String(error)}`)
    }
  }

  async notifyUsers(userIds: string[]): Promise<void> {
    await Promise.all([...new Set(userIds)].map((userId) => this.notifyUser(userId)))
  }

  /**
   * One stream per SSE connection, with its OWN Redis connection: a connection
   * in subscribe mode can no longer run regular commands, so it cannot be
   * shared with the publisher above nor between two viewers.
   *
   * The teardown returned by the Observable is what prevents a connection leak
   * — it runs when the client disconnects (closes the tab, loses the network),
   * which Nest turns into an unsubscribe.
   */
  streamFor(userId: string): Observable<{ data: string }> {
    return new Observable<{ data: string }>((subscriber) => {
      const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

      connection.subscribe(channelFor(userId)).catch((error) => {
        this.logger.warn(`failed to subscribe ${userId}: ${String(error)}`)
        subscriber.error(error)
      })

      // The payload carries no meaning — see notifyUser.
      connection.on('message', () => subscriber.next({ data: 'refresh' }))

      return () => {
        void connection.quit()
      }
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit()
  }
}
