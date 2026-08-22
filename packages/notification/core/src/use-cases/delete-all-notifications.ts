import { UseCase } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/** Empties the user's inbox in one go — same reasoning as
 * MarkAllNotificationsAsRead, and scoped to one user by the port's signature. */
export default class DeleteAllNotifications implements UseCase<Input, void> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute({ userId }: Input): Promise<void> {
    await this.repository.deleteAllByUser(userId)
  }
}
