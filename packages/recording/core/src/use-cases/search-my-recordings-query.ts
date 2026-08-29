import { UseCase } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the query string. */
  ownerId: string
  term: string
  /** Recordings the OTHER contexts matched by their own text (transcript,
   * summary). This context does not know what they searched, only that these
   * ids are candidates — and it still answers with the owner's rows only. */
  matchedIds?: string[]
  limit?: number
}

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
/** Below two characters every library "matches", which is not a search. */
const MIN_TERM_LENGTH = 2

/**
 * Search over the owner's library. The TITLE is this context's to match; the
 * transcript and the summary belong to other contexts, so the app layer asks
 * them first and hands the matching ids over here — where ownership lives.
 */
export default class SearchMyRecordingsQuery implements UseCase<Input, RecordingDTO[]> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute({ ownerId, term, matchedIds, limit }: Input): Promise<RecordingDTO[]> {
    const searched = term?.trim() ?? ''
    const ids = matchedIds ?? []
    // Nothing to search by and nothing already matched: an empty answer beats
    // quietly returning the whole library as if it were a result.
    if (searched.length < MIN_TERM_LENGTH && ids.length === 0) return []

    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.searchByOwnerQuery(ownerId, searched, ids, size)
  }
}
