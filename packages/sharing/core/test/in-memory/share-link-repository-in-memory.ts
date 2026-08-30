import { ShareLink, ShareLinkDTO, ShareLinkQueryRepository, ShareLinkRepository } from '../../src'

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

export default class ShareLinkRepositoryInMemory
  implements ShareLinkRepository, ShareLinkQueryRepository
{
  private rows: ShareLinkRow[] = []

  private serialize(link: ShareLink): ShareLinkRow {
    return {
      id: link.id.value,
      ownerId: link.ownerId,
      recordingId: link.recordingId,
      token: link.token.value,
      includesTranscript: link.scope.transcript,
      includesAudio: link.scope.audio,
      expiresAt: link.expiresAt,
      revokedAt: link.revokedAt,
      viewCount: link.viewCount,
      lastViewedAt: link.lastViewedAt,
      createdAt: link.createdAt,
    }
  }

  private reconstitute(row: ShareLinkRow): ShareLink {
    return new ShareLink({ ...row })
  }

  async create(link: ShareLink): Promise<void> {
    this.rows.push(this.serialize(link))
  }

  async findById(id: string): Promise<ShareLink | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const row = this.rows.find((current) => current.token === token)
    return row ? this.reconstitute(row) : null
  }

  async update(link: ShareLink): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === link.id.value)
    if (index >= 0) this.rows[index] = this.serialize(link)
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.recordingId !== recordingId)
  }

  async listByOwnerQuery(ownerId: string, recordingId?: string): Promise<ShareLinkDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .filter((row) => !recordingId || row.recordingId === recordingId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .map((row) => ({ ...row }))
  }

  async findByTokenQuery(token: string): Promise<ShareLinkDTO | null> {
    const row = this.rows.find((current) => current.token === token)
    return row ? { ...row } : null
  }

  get size(): number {
    return this.rows.length
  }
}
