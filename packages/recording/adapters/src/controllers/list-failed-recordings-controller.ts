import { ListFailedRecordingsQuery, RecordingDTO, RecordingQueryRepository } from '@recording/core'

export default class ListFailedRecordingsController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(limit?: number): Promise<RecordingDTO[]> {
    return new ListFailedRecordingsQuery(this.queryRepository).execute(limit)
  }
}
