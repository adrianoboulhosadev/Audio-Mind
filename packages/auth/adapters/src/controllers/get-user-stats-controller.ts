import { GetUserStatsQuery, UserQueryRepository, UserStatsDTO } from '@auth/core'

export default class GetUserStatsController {
  constructor(private readonly queryRepository: UserQueryRepository) {}

  async execute(): Promise<UserStatsDTO> {
    return new GetUserStatsQuery(this.queryRepository).execute()
  }
}
