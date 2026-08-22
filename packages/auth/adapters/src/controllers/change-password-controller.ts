import { ChangePassword, UserRepository, HashProvider } from '@auth/core'
import { ChangePasswordInput } from '../@types'

export default class ChangePasswordController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  async execute(userId: string, input: ChangePasswordInput): Promise<void> {
    await new ChangePassword(this.userRepository, this.hashProvider).execute({ userId, ...input })
  }
}
