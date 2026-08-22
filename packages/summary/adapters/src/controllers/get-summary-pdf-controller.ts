import { GetSummaryPdfQuery, SummaryQueryRepository } from '@summary/core'

export default class GetSummaryPdfController {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute(recordingId: string): Promise<string> {
    return new GetSummaryPdfQuery(this.queryRepository).execute(recordingId)
  }
}
