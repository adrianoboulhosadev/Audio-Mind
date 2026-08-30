import { ListUsersQuery, UserDTO, UserQueryRepository } from '@auth/core'

export default class ListUsersController {
  constructor(private readonly queryRepository: UserQueryRepository) {}

  async execute(term?: string, limit?: number): Promise<UserDTO[]> {
    return new ListUsersQuery(this.queryRepository).execute({ term, limit })
  }
}
