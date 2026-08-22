import { UseCase } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the query string. */
  ownerId: string
  limit?: number
}

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

/** The owner's library. The limit comes from the caller and is clamped here, so
 * a hand-crafted query string cannot ask for the whole table. */
export default class ListMyRecordingsQuery implements UseCase<Input, RecordingDTO[]> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute({ ownerId, limit }: Input): Promise<RecordingDTO[]> {
    // `limit` reaches here from a query string, so a garbage value (NaN) has to
    // fall back instead of poisoning the arithmetic below.
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.listByOwnerQuery(ownerId, size)
  }
}
