import { UseCase } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Clears the badge in one statement instead of loading every entity: there is
 * no per-notification invariant to enforce, and an inbox can be long. Scoped to
 * ONE user by the port's signature, so there is no way to phrase a call that
 * touches somebody else's inbox.
 */
export default class MarkAllNotificationsAsRead implements UseCase<Input, void> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute({ userId }: Input): Promise<void> {
    await this.repository.markAllAsRead(userId)
  }
}
