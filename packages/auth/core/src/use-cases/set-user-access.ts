import { UseCase, ConflictError, NotFoundError, Errors } from 'shared'
import { AuthSessionRepository, UserRepository } from '../providers'

interface Input {
  /** Who is doing it — resolved from the JWT, and already checked to be an
   * admin at the HTTP boundary. It is here for ONE rule (see below). */
  actorId: string
  userId: string
  role?: string
  active?: boolean
}

/**
 * What an administrator may change about somebody ELSE's account: their role,
 * and whether they can log in at all.
 *
 * Two decisions live here rather than in a controller:
 *
 * - **Never on yourself.** The one person holding the keys must not be able to
 *   demote or lock themselves out with a click; there is no bootstrap flow to
 *   get admin back (the first one is made by hand in the database).
 * - **Deactivating drops the sessions.** Otherwise the account keeps working on
 *   whichever devices are already logged in until their refresh expires, which
 *   is exactly the window an admin was trying to close.
 *
 * This is NOT the account-erasure path. Deactivating keeps everything the person
 * has; erasure (LGPD) is what the profile screen offers, to its owner only.
 */
export default class SetUserAccess implements UseCase<Input, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly sessionRepository?: AuthSessionRepository,
  ) {}

  async execute({ actorId, userId, role, active }: Input): Promise<void> {
    if (actorId === userId) ConflictError.throwError(Errors.CANNOT_CHANGE_OWN_ACCESS, userId)

    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND, userId)

    if (role !== undefined) user.changeRole(role)
    if (active === true) user.reactivate()
    if (active === false) user.deactivate()

    await this.repository.updateAccess(userId, { role: user.role, active: user.active })

    if (active === false) await this.sessionRepository?.deleteAllByUser(userId)
  }
}
