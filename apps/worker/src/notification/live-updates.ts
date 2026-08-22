import IORedis from 'ioredis'

/** The channel literal MUST match the backend's (apps/backend .../live-updates.ts):
 * one channel per recipient, so a subscriber only ever gets its OWN pings. */
export function channelFor(userId: string): string {
  return `notifications-${userId}`
}

/**
 * Pushes "your inbox changed" to whichever BACKEND instance is holding that
 * user's SSE connection. This is the reason the transport is Redis and not an
 * in-process emitter: the process that finishes the pipeline (this one) is never
 * the process holding the browser's connection.
 *
 * Best-effort by design: the notification is already committed, so a failed ping
 * costs only the live refresh — the user still sees it on the next read.
 */
export class LiveUpdates {
  private readonly publisher: IORedis

  constructor(redisUrl: string) {
    this.publisher = new IORedis(redisUrl, { maxRetriesPerRequest: null })
  }

  async notifyUsers(userIds: string[]): Promise<void> {
    await Promise.all(
      [...new Set(userIds)].map(async (userId) => {
        try {
          await this.publisher.publish(channelFor(userId), '1')
        } catch (error) {
          console.error(`[worker] failed to push a live update to ${userId}:`, error)
        }
      }),
    )
  }

  async close(): Promise<void> {
    await this.publisher.quit()
  }
}
