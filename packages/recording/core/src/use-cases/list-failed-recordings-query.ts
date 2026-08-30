import { UseCase } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * The recordings that FAILED, whoever owns them — a SYSTEM read (see the port).
 *
 * It is the one screen where reading across owners earns its keep: a failure is
 * a fact about the pipeline, and the reason is written on the row. Seeing twenty
 * of them side by side is how "a Groq aposentou o modelo" stops being twenty
 * separate mysteries.
 */
export default class ListFailedRecordingsQuery implements UseCase<number | undefined, RecordingDTO[]> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(limit?: number): Promise<RecordingDTO[]> {
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.listFailedQuery(size)
  }
}
