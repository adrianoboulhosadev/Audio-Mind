import { Injectable } from '@nestjs/common'
import {
  ShareLink,
  ShareLinkDTO,
  ShareLinkQueryRepository,
  ShareLinkRepository,
} from '@sharing/adapters'
import { PrismaService } from '../db/prisma.service'

interface ShareLinkRow {
  id: string
  ownerId: string
  recordingId: string
  token: string
  includesTranscript: boolean
  includesAudio: boolean
  expiresAt: Date
  revokedAt: Date | null
  viewCount: number
  lastViewedAt: Date | null
  createdAt: Date
}

@Injectable()
export class PrismaShareLinkRepository implements ShareLinkRepository, ShareLinkQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row, INLINE: the constructor rebuilds
  // the value objects and re-checks the invariants.
  private reconstitute(row: ShareLinkRow): ShareLink {
    return new ShareLink({ ...row })
  }

  async create(link: ShareLink): Promise<void> {
    await this.prisma.shareLink.create({
      data: {
        id: link.id.value,
        ownerId: link.ownerId,
        recordingId: link.recordingId,
        token: link.token.value,
        includesTranscript: link.scope.transcript,
        includesAudio: link.scope.audio,
        expiresAt: link.expiresAt,
      },
    })
  }

  async findById(id: string): Promise<ShareLink | null> {
    const row = await this.prisma.shareLink.findUnique({ where: { id } })
    return row ? this.reconstitute(row) : null
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const row = await this.prisma.shareLink.findUnique({ where: { token } })
    return row ? this.reconstitute(row) : null
  }

  // The scope and the expiry never change after creation (sharing again means a
  // NEW link): what moves is being revoked and being opened.
  async update(link: ShareLink): Promise<void> {
    await this.prisma.shareLink.update({
      where: { id: link.id.value },
      data: {
        revokedAt: link.revokedAt,
        viewCount: link.viewCount,
        lastViewedAt: link.lastViewedAt,
      },
    })
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    await this.prisma.shareLink.deleteMany({ where: { recordingId } })
  }

  async listByOwnerQuery(ownerId: string, recordingId?: string): Promise<ShareLinkDTO[]> {
    return this.prisma.shareLink.findMany({
      where: { ownerId, ...(recordingId ? { recordingId } : {}) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByTokenQuery(token: string): Promise<ShareLinkDTO | null> {
    return this.prisma.shareLink.findUnique({ where: { token } })
  }
}
