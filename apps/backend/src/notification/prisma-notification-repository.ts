import { Injectable } from '@nestjs/common'
import {
  Notification,
  NotificationDTO,
  NotificationQueryRepository,
  NotificationRepository,
  NotificationType,
} from '@notification/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaNotificationRepository
  implements NotificationRepository, NotificationQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private reconstitute(row: {
    id: string
    userId: string
    type: string
    title: string
    body: string
    link: string | null
    referenceId: string | null
    readAt: Date | null
    createdAt: Date
  }): Notification {
    return new Notification({ ...row, type: row.type as NotificationType })
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } })
    return row ? this.reconstitute(row) : null
  }

  /**
   * IDEMPOTENT by (userId, type, referenceId) — the unique index plus
   * skipDuplicates is what keeps a retried pipeline job from writing the same
   * inbox line twice. Events with no reference (the welcome line) may repeat on
   * purpose: two NULLs never collide in Postgres.
   */
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
        readAt: notification.readAt,
      })),
      skipDuplicates: true,
    })
  }

  async update(notification: Notification): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id.value },
      data: { readAt: notification.readAt },
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } })
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { userId } })
  }

  async listByUserQuery(userId: string, limit: number): Promise<NotificationDTO[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt,
    }))
  }

  async countUnreadQuery(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } })
  }
}
