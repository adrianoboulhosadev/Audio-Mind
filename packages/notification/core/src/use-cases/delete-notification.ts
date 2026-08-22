import { UseCase, NotFoundError, Errors } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  notificationId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Removes one line from the user's own inbox. The inbox is a DELIVERY RECORD,
 * not an audit trail — what actually happened lives in the recording, the
 * transcript and the summary — so clearing a line here erases no history.
 */
export default class DeleteNotification implements UseCase<Input, void> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute({ notificationId, userId }: Input): Promise<void> {
    const notification = await this.repository.findById(notificationId)
    if (!notification || notification.userId !== userId) {
      NotFoundError.throwError(Errors.NOTIFICATION_NOT_FOUND, notificationId)
    }

    await this.repository.deleteById(notificationId)
  }
}
