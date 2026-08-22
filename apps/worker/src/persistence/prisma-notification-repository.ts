import { PrismaClient } from 'database'
import { Notification, NotificationRepository } from '@notification/adapters'

/**
 * The worker only ever WRITES notifications (the inbox is read over HTTP), so
 * this adapter implements just the write port — the read half has no caller
 * here and an unused implementation is one more thing to keep true.
 */
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** IDEMPOTENT by (userId, type, referenceId): a re-delivered pipeline job
   * must not write the same inbox line twice. */
  async createMany(notifications: Notification[]): Promise<void> {
    if (!notifications.length) return

    await this.prisma.notification.createMany({
      data: notifications.map((notification) => ({
        id: notification.id.value,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        referenceId: notification.referenceId,
      })),
      skipDuplicates: true,
    })
  }

  async findById(): Promise<Notification | null> {
    throw new Error('The worker does not read notifications.')
  }

  async update(): Promise<void> {
    throw new Error('The worker does not update notifications.')
  }

  async markAllAsRead(): Promise<void> {
    throw new Error('The worker does not update notifications.')
  }

  async deleteById(): Promise<void> {
    throw new Error('The worker does not delete notifications.')
  }

  async deleteAllByUser(): Promise<void> {
    throw new Error('The worker does not delete notifications.')
  }
}
