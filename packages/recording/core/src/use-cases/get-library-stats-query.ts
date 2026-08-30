import { UseCase } from 'shared'
import { LibraryStatsDTO } from '../model'
import { RecordingQueryRepository } from '../providers'

/**
 * Totals of every recording in the installation — a SYSTEM read, with no owner.
 *
 * Its own use case, deliberately: whoever calls it is asking about everybody's
 * data, and that has to be something a route asks for by name (the admin one),
 * never something an ordinary read falls into by omitting an argument.
 */
export default class GetLibraryStatsQuery implements UseCase<void, LibraryStatsDTO> {
  constructor(private readonly queryRepository: RecordingQueryRepository) {}

  async execute(): Promise<LibraryStatsDTO> {
    return this.queryRepository.statsQuery()
  }
}
