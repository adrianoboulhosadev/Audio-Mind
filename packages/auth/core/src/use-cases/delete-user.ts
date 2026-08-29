import { UseCase, NotFoundError, Errors } from 'shared'
import { AuthSessionRepository, UserRepository } from '../providers'

/**
 * ERASURE of the identity: the row goes away, not a flag on it.
 *
 * This is the account side of the LGPD's right to elimination (Lei 13.709/2018,
 * art. 18, VI) — what the profile screen promises the user. Everything the user
 * PRODUCED (audio, transcripts, summaries, PDFs, inbox) belongs to other
 * contexts, so wiping it is orchestrated by the app layer around this call,
 * exactly like the recording delete cascade; this use case owns only the
 * identity and its sessions.
 *
 * Sessions go first: a half-finished erasure must never leave a live refresh
 * token pointing at an account that is on its way out. Anti-IDOR lives at the
 * HTTP boundary — the backend only calls this with the authenticated userId.
 */
export default class DeleteUser implements UseCase<string, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    await this.sessionRepository.deleteAllByUser(userId)
    await this.repository.delete(userId)
  }
}
