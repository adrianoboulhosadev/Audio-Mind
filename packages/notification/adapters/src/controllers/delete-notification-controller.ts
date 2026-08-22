import { DeleteNotification, NotificationRepository } from '@notification/core'

export default class DeleteNotificationController {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    await new DeleteNotification(this.repository).execute({ notificationId, userId })
  }
}
