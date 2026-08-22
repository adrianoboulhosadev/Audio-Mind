import { UseCase, NotFoundError, Errors } from 'shared'
import { UserRepository } from '../providers'

interface Input {
  userId: string
  name?: string | null
}

/**
 * Display-only edit (name) — never touches email/password. The length rule is
 * the DisplayName value object's, applied by `User.editProfile`. Anti-IDOR
 * lives at the HTTP boundary: the backend only calls this with the
 * authenticated userId.
 */
export default class UpdateProfile implements UseCase<Input, void> {
  constructor(private readonly repository: UserRepository) {}

  async execute({ userId, name }: Input): Promise<void> {
    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    user.editProfile({ name })
    await this.repository.updateProfile(userId, { name: user.name })
  }
}
