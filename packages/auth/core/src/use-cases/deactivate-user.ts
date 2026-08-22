import { UseCase, NotFoundError, Errors } from 'shared'
import { AuthSessionRepository, UserRepository } from '../providers'

/**
 * Soft-delete of the identity (active=false) plus revoking every open session —
 * an account that can no longer log in must not stay logged in on another
 * device until its refresh expires. Anti-IDOR lives at the HTTP boundary: the
 * backend only calls this with the authenticated userId.
 */
export default class DeactivateUser implements UseCase<string, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    user.deactivate()
    await this.repository.deactivate(userId)
    await this.sessionRepository.deleteAllByUser(userId)
  }
}
