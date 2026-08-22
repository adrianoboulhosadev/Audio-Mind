import {
  NotificationRepository,
  NotificationQueryRepository,
  NotificationInput,
  NotificationFeedDTO,
} from '@notification/core'
import {
  SendNotificationsController,
  ListMyNotificationsController,
  MarkNotificationAsReadController,
  MarkAllNotificationsAsReadController,
  DeleteNotificationController,
  DeleteAllNotificationsController,
} from '../controllers'

/**
 * Single entry point the apps (NestJS backend and the BullMQ worker) call.
 * Optional ports in the constructor; each method builds its controller.
 *
 * `send` is the write side and has NO HTTP route behind it: notifications are
 * always a consequence of something else that just happened.
 */
export default class NotificationFacade {
  constructor(
    private readonly repository?: NotificationRepository,
    private readonly queryRepository?: NotificationQueryRepository,
  ) {}

  async send(items: NotificationInput[]): Promise<void> {
    await new SendNotificationsController(this.repository!).execute(items)
  }

  async listMyNotifications(userId: string, limit?: number): Promise<NotificationFeedDTO> {
    return new ListMyNotificationsController(this.queryRepository!).execute(userId, limit)
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await new MarkNotificationAsReadController(this.repository!).execute(notificationId, userId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await new MarkAllNotificationsAsReadController(this.repository!).execute(userId)
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await new DeleteNotificationController(this.repository!).execute(notificationId, userId)
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await new DeleteAllNotificationsController(this.repository!).execute(userId)
  }
}
