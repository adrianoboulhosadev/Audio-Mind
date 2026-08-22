import { DeactivateUser, AuthSessionRepository, UserRepository } from '@auth/core'

export default class DeactivateUserController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await new DeactivateUser(this.userRepository, this.sessionRepository).execute(userId)
  }
}
