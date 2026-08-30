import { UseCase } from 'shared'
import { TaskFeedDTO, TaskFilter } from '../model'
import { TaskQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the query string. */
  ownerId: string
  filter?: TaskFilter
  limit?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

/**
 * Everything the owner still has to do (or already did), across every recording.
 * The limit reaches here from a query string, so it is clamped — a hand-crafted
 * one must not be able to ask for the whole table.
 */
export default class ListMyTasksQuery implements UseCase<Input, TaskFeedDTO> {
  constructor(private readonly queryRepository: TaskQueryRepository) {}

  async execute({ ownerId, filter, limit }: Input): Promise<TaskFeedDTO> {
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    const [items, pendingCount] = await Promise.all([
      this.queryRepository.listByOwnerQuery(ownerId, filter ?? 'pending', size),
      this.queryRepository.countPendingQuery(ownerId),
    ])

    return { pendingCount, items }
  }
}
