import {
  GetRecordingForProcessingQuery,
  RecordingQueryRepository,
  RecordingDTO,
} from '@recording/core'

export default class GetRecordingForProcessingController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(recordingId: string): Promise<RecordingDTO> {
    return new GetRecordingForProcessingQuery(this.queryRepository).execute(recordingId)
  }
}
