import { SearchSummariesQuery, SummaryQueryRepository } from '@summary/core'

export default class SearchSummariesController {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute(term: string, recordingIds: string[], limit?: number): Promise<string[]> {
    return new SearchSummariesQuery(this.queryRepository).execute({ term, recordingIds, limit })
  }
}
