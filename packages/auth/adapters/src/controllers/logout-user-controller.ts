import { LogoutUser, AuthSessionRepository, HashProvider } from '@auth/core'

export default class LogoutUserController {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  async execute(userId: string, refreshToken?: string): Promise<void> {
    await new LogoutUser(this.sessionRepository, this.hashProvider).execute({ userId, refreshToken })
  }
}
