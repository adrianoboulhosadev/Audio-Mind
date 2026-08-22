import { AuthSessionRepository, AuthSession } from '../../src'

interface SessionRow {
  id: string
  userId: string
  verifierHash: string
  expiresAt: Date
}

/** Fake of the sessions table (multi-device, one row per rotation family). */
export default class AuthSessionRepositoryInMemory implements AuthSessionRepository {
  private rows: SessionRow[] = []

  private serialize(session: AuthSession): SessionRow {
    return {
      id: session.id.value,
      userId: session.userId,
      verifierHash: session.verifierHash,
      expiresAt: session.expiresAt,
    }
  }

  private reconstitute(row: SessionRow): AuthSession {
    return new AuthSession({
      id: row.id,
      userId: row.userId,
      verifierHash: row.verifierHash,
      expiresAt: row.expiresAt,
    })
  }

  async save(session: AuthSession): Promise<void> {
    this.rows.push(this.serialize(session))
  }

  async findById(id: string): Promise<AuthSession | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async findActiveByUser(userId: string): Promise<AuthSession[]> {
    const now = Date.now()
    return this.rows
      .filter((row) => row.userId === userId && row.expiresAt.getTime() > now)
      .map((row) => this.reconstitute(row))
  }

  async update(session: AuthSession): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === session.id.value)
    if (index >= 0) this.rows[index] = this.serialize(session)
  }

  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.id !== id)
  }

  async deleteAllByUser(userId: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.userId !== userId)
  }

  get size(): number {
    return this.rows.length
  }
}
