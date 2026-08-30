import { UseCase } from 'shared'
import { RecordingDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body. */
  ownerId: string
  ids: string[]
}

/**
 * The rows behind a list of recording ids that came from ANOTHER context (the
 * tasks screen, the annotations screen): those contexts store a recordingId and
 * nothing else, because knowing who owns a recording is this context's job.
 *
 * The owner is part of the query, not a filter applied afterwards — that is what
 * makes an id from anywhere else harmless.
 */
export default class ListRecordingsByIdsQuery implements UseCase<Input, RecordingDTO[]> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute({ ownerId, ids }: Input): Promise<RecordingDTO[]> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return []

    return this.queryRepository.listByIdsQuery(ownerId, unique)
  }
}
