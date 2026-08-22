import { GetSummaryQuery, SummaryQueryRepository, SummaryDTO } from '@summary/core'

export default class GetSummaryController {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute(recordingId: string): Promise<SummaryDTO> {
    return new GetSummaryQuery(this.queryRepository).execute(recordingId)
  }
}
