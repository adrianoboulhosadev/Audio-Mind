import {
  SearchTranscriptsQuery,
  TranscriptionQueryRepository,
  TranscriptMatchDTO,
} from '@transcription/core'

export default class SearchTranscriptsController {
  constructor(private readonly queryRepository: TranscriptionQueryRepository) {}

  async execute(
    term: string,
    recordingIds: string[],
    limit?: number,
  ): Promise<TranscriptMatchDTO[]> {
    return new SearchTranscriptsQuery(this.queryRepository).execute({ term, recordingIds, limit })
  }
}
