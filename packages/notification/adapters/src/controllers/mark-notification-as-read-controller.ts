import { MarkNotificationAsRead, NotificationRepository } from '@notification/core'

export default class MarkNotificationAsReadController {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    await new MarkNotificationAsRead(this.repository).execute({ notificationId, userId })
  }
}
