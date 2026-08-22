import { Injectable } from '@nestjs/common'
import {
  Recording,
  RecordingDTO,
  RecordingQueryRepository,
  RecordingRepository,
  RecordingSource,
  RecordingStatus,
} from '@recording/adapters'
import { PrismaService } from '../db/prisma.service'

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

  async findByIdQuery(id: string): Promise<RecordingDTO | null> {
    const row = await this.prisma.recording.findUnique({ where: { id } })
    return row ? this.toDTO(row) : null
  }
}
