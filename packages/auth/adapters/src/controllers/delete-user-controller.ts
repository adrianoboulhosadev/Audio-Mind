import { DeleteUser, AuthSessionRepository, UserRepository } from '@auth/core'

export default class DeleteUserController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await new DeleteUser(this.userRepository, this.sessionRepository).execute(userId)
  }
}
