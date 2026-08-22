import { UseCase, NotFoundError, Errors } from 'shared'
import { UserDTO } from '../model'
import { UserQueryRepository } from '../providers'

/**
 * Read side (CQRS): receives the id (from the JWT in the "/me" case) and returns
 * the public UserDTO. The query already returns the DTO without password.
 */
export default class FindUserByIdQuery implements UseCase<string, UserDTO> {
  constructor(private readonly userQueryRepository: UserQueryRepository) {}

  async execute(id: string): Promise<UserDTO> {
    const user = await this.userQueryRepository.findByIdQuery(id)

    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    return user
  }
}
