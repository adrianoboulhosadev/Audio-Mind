import { UpdateProfile, UserRepository } from '@auth/core'
import { UpdateProfileInput } from '../@types'

export default class UpdateProfileController {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<void> {
    await new UpdateProfile(this.userRepository).execute({ userId, ...input })
  }
}
