import { UseCase } from 'shared'
import { SummaryQueryRepository } from '../providers'

interface Input {
  term: string
  /** The recordings the caller may search — resolved by the app layer against
   * the recording context, because this one does not know about owners. */
  recordingIds: string[]
  limit?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200
const MIN_TERM_LENGTH = 2

/**
 * Which of the caller's recordings were SUMMARIZED as being about something.
 * Searching the summary as well as the transcript is what makes a vague memory
 * findable: people remember the conclusion ("o combinado do contrato") long
 * after they forget the words actually said.
 */
export default class SearchSummariesQuery implements UseCase<Input, string[]> {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute({ term, recordingIds, limit }: Input): Promise<string[]> {
    const searched = term?.trim() ?? ''
    if (searched.length < MIN_TERM_LENGTH || recordingIds.length === 0) return []

    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.searchRecordingIdsQuery(searched, recordingIds, size)
  }
}
