import { ListRecordingsByIdsQuery, RecordingDTO, RecordingQueryRepository } from '@recording/core'

export default class ListRecordingsByIdsController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(ownerId: string, ids: string[]): Promise<RecordingDTO[]> {
    return new ListRecordingsByIdsQuery(this.queryRepository).execute({ ownerId, ids })
  }
}
