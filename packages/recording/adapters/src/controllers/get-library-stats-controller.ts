import { GetLibraryStatsQuery, LibraryStatsDTO, RecordingQueryRepository } from '@recording/core'

export default class GetLibraryStatsController {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(): Promise<LibraryStatsDTO> {
    return new GetLibraryStatsQuery(this.queryRepository).execute()
  }
}
