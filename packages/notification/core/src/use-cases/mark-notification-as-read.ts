import { UseCase, NotFoundError, Errors } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  notificationId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Someone else's notification answers exactly like a missing one: never confirm
 * to a stranger that a given notification exists — an inbox is private, unlike
 * a public page.
 */
export default class MarkNotificationAsRead implements UseCase<Input, void> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute({ notificationId, userId }: Input): Promise<void> {
    const notification = await this.repository.findById(notificationId)
    if (!notification || notification.userId !== userId) {
      NotFoundError.throwError(Errors.NOTIFICATION_NOT_FOUND, notificationId)
    }

    notification.markAsRead()
    await this.repository.update(notification)
  }
}
