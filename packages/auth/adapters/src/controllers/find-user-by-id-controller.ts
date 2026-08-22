import { FindUserByIdQuery, UserQueryRepository, UserDTO } from '@auth/core'

export default class FindUserByIdController {
  constructor(private readonly userQueryRepository: UserQueryRepository) {}

  async execute(id: string): Promise<UserDTO> {
    return new FindUserByIdQuery(this.userQueryRepository).execute(id)
  }
}
