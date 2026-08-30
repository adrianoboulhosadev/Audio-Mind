import { Prisma, PrismaClient } from 'database'
import {
  Recording,
  RecordingDTO,
  LibraryStatsDTO,
  OwnerUsageDTO,
  RecordingQueryRepository,
  RecordingRepository,
  RecordingSource,
  RecordingStatus,
  toRecordingKind,
} from '@recording/adapters'

interface RecordingRow {
  id: string
  ownerId: string
  title: string
  kind: string
  source: string
  audioUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
  status: string
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * The worker's own driven adapter. Same table as the backend's repository and
 * deliberately a separate class: a driven adapter lives in the APP that consumes
 * the port, and these two apps consume different halves of it (the backend the
 * user's side, the worker the pipeline's).
 */
export class PrismaRecordingRepository implements RecordingRepository, RecordingQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private reconstitute(row: RecordingRow): Recording {
    return new Recording({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      kind: toRecordingKind(row.kind),
      source: row.source as RecordingSource,
      audioUrl: row.audioUrl,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      durationSeconds: row.durationSeconds,
      status: row.status as RecordingStatus,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async create(recording: Recording): Promise<void> {
    await this.prisma.recording.create({
      data: {
        id: recording.id.value,
        ownerId: recording.ownerId,
        title: recording.title.value,
        kind: recording.kind,
        source: recording.source,
        audioUrl: recording.audio.url,
        mimeType: recording.audio.mimeType,
        sizeBytes: recording.audio.sizeBytes,
        durationSeconds: recording.audio.durationSeconds,
        status: recording.status,
        failureReason: recording.failureReason,
      },
    })
  }

  async findById(id: string): Promise<Recording | null> {
    const row = await this.prisma.recording.findUnique({ where: { id } })
    return row ? this.reconstitute(row) : null
  }

  async update(recording: Recording): Promise<void> {
    await this.prisma.recording.update({
      where: { id: recording.id.value },
      data: {
        title: recording.title.value,
        kind: recording.kind,
        status: recording.status,
        failureReason: recording.failureReason,
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recording.delete({ where: { id } })
  }

  async listByOwnerQuery(ownerId: string, limit: number): Promise<RecordingDTO[]> {
    const rows = await this.prisma.recording.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => this.toDTO(row))
  }

  // The worker never searches — it processes one job at a time. Implemented
  // because the READ port is one interface, and answering "nothing" is honest:
  // there is no caller here to answer anything else to.
  async listAllIdsByOwnerQuery(ownerId: string): Promise<string[]> {
    const rows = await this.prisma.recording.findMany({ where: { ownerId }, select: { id: true } })
    return rows.map((row) => row.id)
  }

  async listByIdsQuery(ownerId: string, ids: string[]): Promise<RecordingDTO[]> {
    const rows = await this.prisma.recording.findMany({
      where: { ownerId, id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  async searchByOwnerQuery(
    ownerId: string,
    term: string,
    alsoIds: string[],
    limit: number,
  ): Promise<RecordingDTO[]> {
    const matches: Prisma.RecordingWhereInput[] = []
    if (term) matches.push({ title: { contains: term, mode: 'insensitive' as const } })
    if (alsoIds.length > 0) matches.push({ id: { in: alsoIds } })

    const rows = await this.prisma.recording.findMany({
      where: { ownerId, OR: matches },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => this.toDTO(row))
  }

  // SYSTEM reads of the admin screen. The worker never asks for them; the READ
  // port is one interface, so they are answered honestly.
  async statsQuery(): Promise<LibraryStatsDTO> {
    const grouped = await this.prisma.recording.groupBy({ by: ['status'], _count: { _all: true } })
    const totals = await this.prisma.recording.aggregate({
      _sum: { sizeBytes: true },
      _count: { _all: true },
    })

    const byStatus = { pending: 0, transcribing: 0, summarizing: 0, ready: 0, failed: 0 }
    for (const row of grouped) {
      const status = row.status as keyof typeof byStatus
      if (status in byStatus) byStatus[status] = row._count._all
    }

    return { byStatus, total: totals._count._all, storageBytes: totals._sum.sizeBytes ?? 0 }
  }

  async listFailedQuery(limit: number): Promise<RecordingDTO[]> {
    const rows = await this.prisma.recording.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => this.toDTO(row))
  }

  async usageByOwnersQuery(ownerIds: string[]): Promise<OwnerUsageDTO[]> {
    const rows = await this.prisma.recording.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: ownerIds } },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    })
    return rows.map((row) => ({
      ownerId: row.ownerId,
      recordings: row._count._all,
      storageBytes: row._sum.sizeBytes ?? 0,
    }))
  }

  async findByIdQuery(id: string): Promise<RecordingDTO | null> {
    const row = await this.prisma.recording.findUnique({ where: { id } })
    return row ? this.toDTO(row) : null
  }

  private toDTO(row: RecordingRow): RecordingDTO {
    return {
      ...row,
      kind: toRecordingKind(row.kind),
      source: row.source as RecordingSource,
      status: row.status as RecordingStatus,
    }
  }
}
