import { UseCase, ValidationError, NotFoundError, Errors } from 'shared'
import { StrongPassword, PasswordHash } from '../model'
import { UserRepository, HashProvider } from '../providers'

interface Input {
  userId: string
  oldPassword: string
  newPassword: string
}

/**
 * The backend only calls this use case with the userId already authenticated
 * (from the JWT), so the anti-IDOR protection lives at the HTTP boundary — the
 * core operates on the authorized id. The new-password policy is the
 * StrongPassword value object's rule.
 */
export default class ChangePassword implements UseCase<Input, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly hash: HashProvider,
  ) {}

  async execute(input: Input): Promise<void> {
    const { userId, oldPassword, newPassword } = input

    const newStrongPassword = new StrongPassword(newPassword)

    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    if (!user.password || !this.hash.compare(oldPassword, user.password.value)) {
      ValidationError.throwError(Errors.INVALID_PASSWORD)
    }
    if (this.hash.compare(newStrongPassword.value, user.password.value)) {
      ValidationError.throwError(Errors.PASSWORD_SAME_AS_PREVIOUS)
    }

    const newHash = new PasswordHash(this.hash.hash(newStrongPassword.value))
    await this.repository.changePassword(userId, newHash.value)
  }
}
