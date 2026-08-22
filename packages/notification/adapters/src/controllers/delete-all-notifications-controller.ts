import { DeleteAllNotifications, NotificationRepository } from '@notification/core'

export default class DeleteAllNotificationsController {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await new DeleteAllNotifications(this.repository).execute({ userId })
  }
}
