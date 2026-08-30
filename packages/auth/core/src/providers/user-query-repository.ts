import { UserDTO, UserStatsDTO } from '../model'

/** User READ port (query side of CQRS). */
export interface UserQueryRepository {
  findByIdQuery(id: string): Promise<UserDTO | null>
  /**
   * Every account, newest first, capped — the ADMIN listing, and the only read
   * in this whole codebase that is not scoped to one person.
   *
   * It is a separate method (rather than an optional argument on the one above)
   * for the same reason the recording context keeps its system read separate: an
   * optional "everyone" flag is one forgotten argument away from becoming an
   * unguarded read on an ordinary route.
   */
  listAllQuery(limit: number, term?: string): Promise<UserDTO[]>
  /** Totals for the admin overview. */
  statsQuery(): Promise<UserStatsDTO>
}
