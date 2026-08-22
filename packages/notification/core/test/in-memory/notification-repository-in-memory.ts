import {
  Notification,
  NotificationDTO,
  NotificationQueryRepository,
  NotificationRepository,
  NotificationType,
} from '../../src'

interface NotificationRow {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  referenceId: string | null
  readAt: Date | null
  createdAt: Date
}

/**
 * Fake of the notifications table, INCLUDING the unique index on
 * (userId, type, referenceId) — that index is the whole idempotency guarantee,
 * so a fake without it would let a test pass on a duplicate the real database
 * would refuse.
 */
export default class NotificationRepositoryInMemory
  implements NotificationRepository, NotificationQueryRepository
{
  private rows: NotificationRow[] = []

  private serialize(notification: Notification): NotificationRow {
    return {
      id: notification.id.value,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      referenceId: notification.referenceId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }
  }

  private reconstitute(row: NotificationRow): Notification {
    return new Notification({ ...row })
  }

  async findById(id: string): Promise<Notification | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async createMany(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      const row = this.serialize(notification)
      // Two NULL reference ids never collide in Postgres either — an event with
      // no reference (the welcome line) may legitimately repeat.
      const duplicate =
        row.referenceId !== null &&
        this.rows.some(
          (current) =>
            current.userId === row.userId &&
            current.type === row.type &&
            current.referenceId === row.referenceId,
        )
      if (!duplicate) this.rows.push(row)
    }
  }

  async update(notification: Notification): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === notification.id.value)
    if (index >= 0) this.rows[index] = this.serialize(notification)
  }

  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date()
    for (const row of this.rows) {
      if (row.userId === userId && !row.readAt) row.readAt = now
    }
  }

  async deleteById(id: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.id !== id)
  }

  async deleteAllByUser(userId: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.userId !== userId)
  }

  async listByUserQuery(userId: string, limit: number): Promise<NotificationDTO[]> {
    return this.rows
      .filter((row) => row.userId === userId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        read: row.readAt !== null,
        createdAt: row.createdAt,
      }))
  }

  async countUnreadQuery(userId: string): Promise<number> {
    return this.rows.filter((row) => row.userId === userId && !row.readAt).length
  }

  get size(): number {
    return this.rows.length
  }
}
