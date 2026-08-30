import { Injectable } from '@nestjs/common'
import {
  Annotation,
  AnnotationDTO,
  AnnotationQueryRepository,
  AnnotationRepository,
} from '@annotation/adapters'
import { PrismaService } from '../db/prisma.service'

interface AnnotationRow {
  id: string
  ownerId: string
  recordingId: string
  atSeconds: number
  note: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class PrismaAnnotationRepository implements AnnotationRepository, AnnotationQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private reconstitute(row: AnnotationRow): Annotation {
    return new Annotation({ ...row })
  }

  private toDTO(row: AnnotationRow): AnnotationDTO {
    return {
      id: row.id,
      recordingId: row.recordingId,
      atSeconds: row.atSeconds,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async create(annotation: Annotation): Promise<void> {
    await this.prisma.annotation.create({
      data: {
        id: annotation.id.value,
        ownerId: annotation.ownerId,
        recordingId: annotation.recordingId,
        atSeconds: annotation.at.value,
        note: annotation.note?.value ?? null,
      },
    })
  }

  async findById(id: string): Promise<Annotation | null> {
    const row = await this.prisma.annotation.findUnique({ where: { id } })
    return row ? this.reconstitute(row) : null
  }

  // The moment a mark points at never moves; the words on it do.
  async update(annotation: Annotation): Promise<void> {
    await this.prisma.annotation.update({
      where: { id: annotation.id.value },
      data: { note: annotation.note?.value ?? null },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.annotation.delete({ where: { id } })
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    await this.prisma.annotation.deleteMany({ where: { recordingId } })
  }

  async listByRecordingQuery(recordingId: string): Promise<AnnotationDTO[]> {
    const rows = await this.prisma.annotation.findMany({
      where: { recordingId },
      orderBy: { atSeconds: 'asc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  async listByOwnerQuery(ownerId: string, limit: number): Promise<AnnotationDTO[]> {
    const rows = await this.prisma.annotation.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => this.toDTO(row))
  }
}
