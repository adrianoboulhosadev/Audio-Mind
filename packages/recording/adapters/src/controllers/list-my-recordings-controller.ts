import { ListMyRecordingsQuery, RecordingQueryRepository, RecordingDTO } from '@recording/core'

export default class ListMyRecordingsController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(ownerId: string, limit?: number): Promise<RecordingDTO[]> {
    return new ListMyRecordingsQuery(this.queryRepository).execute({ ownerId, limit })
  }
}
