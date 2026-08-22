import { Injectable } from '@nestjs/common'
import { AuthSessionRepository, AuthSession } from '@auth/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private reconstitute(row: {
    id: string
    userId: string
    verifierHash: string
    expiresAt: Date
  }): AuthSession {
    return new AuthSession({
      id: row.id,
      userId: row.userId,
      verifierHash: row.verifierHash,
      expiresAt: row.expiresAt,
    })
  }

  async save(session: AuthSession): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        id: session.id.value,
        userId: session.userId,
        verifierHash: session.verifierHash,
        expiresAt: session.expiresAt,
        // createdAt is infra: the DB handles it (default).
      },
    })
  }

  async findById(id: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({ where: { id } })
    return session ? this.reconstitute(session) : null
  }

  async findActiveByUser(userId: string): Promise<AuthSession[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    })
    return sessions.map((session) => this.reconstitute(session))
  }

  async update(session: AuthSession): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: session.id.value },
      data: { verifierHash: session.verifierHash, expiresAt: session.expiresAt },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.authSession.delete({ where: { id } })
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.authSession.deleteMany({ where: { userId } })
  }
}
