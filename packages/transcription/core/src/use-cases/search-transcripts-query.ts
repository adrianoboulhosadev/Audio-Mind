import { UseCase } from 'shared'
import { TranscriptMatchDTO } from '../model'
import { TranscriptionQueryRepository } from '../providers'

interface Input {
  term: string
  /** The recordings the caller may search — resolved by the app layer against
   * the recording context, because this one does not know about owners. */
  recordingIds: string[]
  limit?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200
/** Below two characters every transcript matches, which is not a search. */
const MIN_TERM_LENGTH = 2

/**
 * Which of the caller's recordings were TALKING about something — and where in
 * each one. The transcript is the biggest thing this app stores and the only
 * place a passing remark is ever written down, so it is where a search earns its
 * keep; answering with the stretch and its timestamp is what lets the screen
 * take someone straight to the moment instead of to the audio.
 */
export default class SearchTranscriptsQuery implements UseCase<Input, TranscriptMatchDTO[]> {
  constructor(private readonly queryRepository: TranscriptionQueryRepository) {}

  async execute({ term, recordingIds, limit }: Input): Promise<TranscriptMatchDTO[]> {
    const searched = term?.trim() ?? ''
    if (searched.length < MIN_TERM_LENGTH || recordingIds.length === 0) return []

    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.searchMatchesQuery(searched, recordingIds, size)
  }
}
