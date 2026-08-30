import { Injectable } from '@nestjs/common'
import { Prisma } from 'database'
import {
  Recording,
  RecordingDTO,
  RecordingQueryRepository,
  RecordingRepository,
  RecordingSource,
  RecordingStatus,
  toRecordingKind,
} from '@recording/adapters'
import { PrismaService } from '../db/prisma.service'

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

@Injectable()
export class PrismaRecordingRepository implements RecordingRepository, RecordingQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row, INLINE (no toDomain helper): the
  // constructor is what rebuilds the value objects and re-checks the invariants.
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

  private toDTO(row: RecordingRow): RecordingDTO {
    return {
      ...row,
      kind: toRecordingKind(row.kind),
      source: row.source as RecordingSource,
      status: row.status as RecordingStatus,
    }
  }

  async create(recording: Recording): Promise<void> {
    await this.prisma.recording.create({
      data: {
        id: recording.id.value,
        ownerId: recording.ownerId,
        title: recording.title.value,
        kind: recording.kind,
        source: recording.source,
        // Serializing reads the value objects — the entity never leaks raw props.
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

  // Only what a transition can change: the audio and its owner are what was
  // actually recorded, and no use case rewrites them.
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

  /** Ids only, uncapped: the app layer needs the WHOLE set to ask the other
   * contexts which of these recordings mention a word (see the port). */
  async listAllIdsByOwnerQuery(ownerId: string): Promise<string[]> {
    const rows = await this.prisma.recording.findMany({
      where: { ownerId },
      select: { id: true },
    })
    return rows.map((row) => row.id)
  }

  async listByIdsQuery(ownerId: string, ids: string[]): Promise<RecordingDTO[]> {
    const rows = await this.prisma.recording.findMany({
      where: { ownerId, id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  /**
   * Title match OR one of the ids the derived contexts matched, always inside
   * this owner's rows.
   *
   * `contains` + insensitive is ILIKE, not full-text: it needs no column, no
   * index and no dictionary, and for a personal library it answers instantly.
   * The day it stops being instant, the replacement is a tsvector column — and
   * this method is the only place that would change.
   */
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
}
