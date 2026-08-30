import {
  UserRepository,
  UserQueryRepository,
  User,
  UserDTO,
  UserStatsDTO,
  toUserRole,
} from '../../src'

/**
 * Simulates the database TABLE: a plain row with the infra columns (createdAt,
 * lastLoginAt) that do NOT exist in the rich `User`. Writes SERIALIZE the entity
 * (reading its value objects); reads RECONSTITUTE it via the constructor — the
 * same round-trip the real Prisma repository does. The query projects the DTO.
 */
interface UserRow {
  id: string
  email: string
  password: string
  name: string | null
  active: boolean
  // A plain string, like the real column: promoting someone is a hand-run
  // UPDATE, so the fake must be able to hold a value the domain will refuse.
  role: string
  createdAt: Date
  lastLoginAt: Date | null
}

export default class UserRepositoryInMemory implements UserRepository, UserQueryRepository {
  private readonly rows: UserRow[] = []

  private reconstitute(row: UserRow): User {
    return new User({
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      active: row.active,
      role: row.role,
    })
  }

  async register(user: User): Promise<void> {
    this.rows.push({
      id: user.id.value,
      email: user.email.value,
      password: user.password!.value,
      name: user.name,
      active: user.active,
      // Registration is open and everyone starts ordinary — the real column's
      // default says the same thing.
      role: 'user',
      createdAt: new Date(),
      lastLoginAt: null,
    })
  }

  async findById(id: string): Promise<User | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.rows.find((current) => current.email === email)
    return row ? this.reconstitute(row) : null
  }

  async changePassword(id: string, password: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.password = password
  }

  async updateLastLogin(id: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.lastLoginAt = new Date()
  }

  async updateProfile(id: string, fields: { name?: string | null }): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (!row) return
    if (fields.name !== undefined) row.name = fields.name
  }

  async deactivate(id: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.active = false
  }

  async updateAccess(id: string, access: { role: string; active: boolean }): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (!row) return
    row.role = access.role
    row.active = access.active
  }

  async delete(id: string): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === id)
    if (index >= 0) this.rows.splice(index, 1)
  }

  async findByIdQuery(id: string): Promise<UserDTO | null> {
    const row = this.rows.find((current) => current.id === id)
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      active: row.active,
      role: toUserRole(row.role),
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
    }
  }

  async listAllQuery(limit: number, term?: string): Promise<UserDTO[]> {
    const lowered = term?.toLowerCase()
    const matches = this.rows.filter(
      (row) =>
        !lowered ||
        row.email.toLowerCase().includes(lowered) ||
        (row.name ?? '').toLowerCase().includes(lowered),
    )

    return Promise.all(
      matches
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
        .slice(0, limit)
        .map((row) => this.findByIdQuery(row.id) as Promise<UserDTO>),
    )
  }

  async statsQuery(): Promise<UserStatsDTO> {
    return {
      total: this.rows.length,
      active: this.rows.filter((row) => row.active).length,
      admins: this.rows.filter((row) => toUserRole(row.role) === 'admin').length,
    }
  }
}
