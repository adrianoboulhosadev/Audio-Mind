import { RecordingDTO, RecordingQueryRepository, SearchMyRecordingsQuery } from '@recording/core'

export default class SearchMyRecordingsController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(
    ownerId: string,
    term: string,
    matchedIds?: string[],
    limit?: number,
  ): Promise<RecordingDTO[]> {
    return new SearchMyRecordingsQuery(this.queryRepository).execute({
      ownerId,
      term,
      matchedIds,
      limit,
    })
  }
}
