import { Prisma, PrismaClient } from 'database'
import {
  Recording,
  RecordingDTO,
  RecordingQueryRepository,
  RecordingRepository,
  RecordingSource,
  RecordingStatus,
} from '@recording/adapters'

interface RecordingRow {
  id: string
  ownerId: string
  title: string
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

  async findByIdQuery(id: string): Promise<RecordingDTO | null> {
    const row = await this.prisma.recording.findUnique({ where: { id } })
    return row ? this.toDTO(row) : null
  }

  private toDTO(row: RecordingRow): RecordingDTO {
    return { ...row, source: row.source as RecordingSource, status: row.status as RecordingStatus }
  }
}
