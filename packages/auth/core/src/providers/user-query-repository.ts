import { UserDTO } from '../model'

/** User READ port (query side of CQRS). */
export interface UserQueryRepository {
  findByIdQuery(id: string): Promise<UserDTO | null>
}
