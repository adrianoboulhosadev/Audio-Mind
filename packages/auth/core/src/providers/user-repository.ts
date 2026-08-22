import { User } from '../model'

/** User WRITE port (command side of CQRS). Trades the rich `User` entity. */
export interface UserRepository {
  register(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  changePassword(id: string, password: string): Promise<void>
  updateLastLogin(id: string): Promise<void>
  updateProfile(id: string, fields: { name?: string | null }): Promise<void>
  deactivate(id: string): Promise<void>
}
