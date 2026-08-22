import { Injectable } from '@nestjs/common'
import {
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
} from '@transcription/adapters'
import { PrismaService } from '../db/prisma.service'

interface TranscriptionRow {
  id: string
  recordingId: string
  text: string
  language: string | null
  model: string
  createdAt: Date
}

@Injectable()
export class PrismaTranscriptionRepository
  implements TranscriptionRepository, TranscriptionQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * UPSERT keyed by recordingId: retrying a recording runs the model again over
   * the same audio, and the second run must REPLACE the transcript — the unique
   * column would refuse a second row anyway.
   */
  async save(transcription: Transcription): Promise<void> {
    const data = {
      text: transcription.text.value,
      language: transcription.language,
      model: transcription.model,
    }
    await this.prisma.transcription.upsert({
      where: { recordingId: transcription.recordingId },
      create: { id: transcription.id.value, recordingId: transcription.recordingId, ...data },
      update: data,
    })
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    const row = await this.prisma.transcription.findUnique({ where: { recordingId } })
    return row ? new Transcription({ ...row }) : null
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    // deleteMany, not delete: this runs in the app layer's delete cascade, and a
    // recording that failed before being transcribed simply has no row.
    await this.prisma.transcription.deleteMany({ where: { recordingId } })
  }

  async findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null> {
    const row = await this.prisma.transcription.findUnique({ where: { recordingId } })
    return row ? this.toDTO(row) : null
  }

  // wordCount is computed on the read side — a display fact, not a column that
  // could drift from the text next to it.
  private toDTO(row: TranscriptionRow): TranscriptionDTO {
    return { ...row, wordCount: row.text.split(/\s+/).filter(Boolean).length }
  }
}
