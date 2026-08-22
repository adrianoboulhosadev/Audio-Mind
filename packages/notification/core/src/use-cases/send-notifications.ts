import { UseCase } from 'shared'
import { Notification, NotificationInput } from '../model'
import { NotificationRepository } from '../providers'

interface Input {
  items: NotificationInput[]
}

/**
 * The WRITE side, and it has NO HTTP route behind it: a notification is always
 * a consequence of something that just happened (an account created, a pipeline
 * finished), never something a client asks for.
 *
 * Delivery is idempotent by (userId, type, referenceId) at the repository, so a
 * retried job re-sending the same batch is a no-op rather than a duplicated
 * inbox line.
 */
export default class SendNotifications implements UseCase<Input, void> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute({ items }: Input): Promise<void> {
    if (!items.length) return

    await this.repository.createMany(items.map((item) => Notification.for(item)))
  }
}
