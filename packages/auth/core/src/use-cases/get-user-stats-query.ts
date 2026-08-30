import { UseCase } from 'shared'
import { UserStatsDTO } from '../model'
import { UserQueryRepository } from '../providers'

/** Totals of the user base for the admin overview. Counted in the database, so
 * it stays true regardless of how many rows the listing was capped at. */
export default class GetUserStatsQuery implements UseCase<void, UserStatsDTO> {
  constructor(private readonly queryRepository: UserQueryRepository) {}

  async execute(): Promise<UserStatsDTO> {
    return this.queryRepository.statsQuery()
  }
}
