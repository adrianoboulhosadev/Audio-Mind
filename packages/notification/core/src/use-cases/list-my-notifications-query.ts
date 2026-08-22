import { UseCase } from 'shared'
import { NotificationFeedDTO } from '../model'
import { NotificationQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the query string. */
  userId: string
  limit?: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** The inbox feed. Serves both the header bell (a short slice) and the
 * notifications page (a long one) — the limit comes from the caller, clamped
 * here so a hand-crafted query string cannot ask for the whole table. */
export default class ListMyNotificationsQuery implements UseCase<Input, NotificationFeedDTO> {
  constructor(private readonly queryRepository: NotificationQueryRepository) {}

  async execute({ userId, limit }: Input): Promise<NotificationFeedDTO> {
    // `limit` reaches here from a query string, so a garbage value (NaN) has to
    // fall back instead of poisoning the arithmetic below.
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    const [items, unreadCount] = await Promise.all([
      this.queryRepository.listByUserQuery(userId, size),
      this.queryRepository.countUnreadQuery(userId),
    ])

    return { unreadCount, items }
  }
}
