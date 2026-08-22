import { MarkAllNotificationsAsRead, NotificationRepository } from '@notification/core'

export default class MarkAllNotificationsAsReadController {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await new MarkAllNotificationsAsRead(this.repository).execute({ userId })
  }
}
