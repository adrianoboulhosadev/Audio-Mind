import {
  GetTranscriptionQuery,
  TranscriptionQueryRepository,
  TranscriptionDTO,
} from '@transcription/core'

export default class GetTranscriptionController {
  constructor(private readonly queryRepository: TranscriptionQueryRepository) {}

  async execute(recordingId: string): Promise<TranscriptionDTO> {
    return new GetTranscriptionQuery(this.queryRepository).execute(recordingId)
  }
}
