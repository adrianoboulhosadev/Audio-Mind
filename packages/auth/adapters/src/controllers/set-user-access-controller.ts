import { AuthSessionRepository, SetUserAccess, UserRepository } from '@auth/core'
import { SetUserAccessInput } from '../@types'

export default class SetUserAccessController {
  constructor(
    private readonly repository: UserRepository,
    private readonly sessionRepository?: AuthSessionRepository,
  ) {}

  async execute(actorId: string, userId: string, input: SetUserAccessInput): Promise<void> {
    await new SetUserAccess(this.repository, this.sessionRepository).execute({
      actorId,
      userId,
      ...input,
    })
  }
}
