import { GetRecordingQuery, RecordingQueryRepository, RecordingDTO } from '@recording/core'

export default class GetRecordingController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(recordingId: string, ownerId: string): Promise<RecordingDTO> {
    return new GetRecordingQuery(this.queryRepository).execute({ recordingId, ownerId })
  }
}
