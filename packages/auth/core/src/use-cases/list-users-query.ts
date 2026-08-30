import { UseCase } from 'shared'
import { UserDTO } from '../model'
import { UserQueryRepository } from '../providers'

interface Input {
  term?: string
  limit?: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/**
 * Every account — the ADMIN listing, and the only read here that is not scoped
 * to one person. Its own use case (never an optional flag on the by-id read) so
 * that "list everybody" is something a caller has to ask for by name.
 *
 * The limit arrives from a query string, so it is clamped: a hand-crafted one
 * must not be able to ask for the whole table.
 */
export default class ListUsersQuery implements UseCase<Input, UserDTO[]> {
  constructor(private readonly queryRepository: UserQueryRepository) {}

  async execute({ term, limit }: Input): Promise<UserDTO[]> {
    const requested = Number.isFinite(limit) ? Math.trunc(limit!) : DEFAULT_LIMIT
    const size = Math.min(Math.max(requested, 1), MAX_LIMIT)

    return this.queryRepository.listAllQuery(size, term?.trim() || undefined)
  }
}
