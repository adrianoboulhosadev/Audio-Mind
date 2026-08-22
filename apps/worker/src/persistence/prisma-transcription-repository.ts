import { PrismaClient } from 'database'
import {
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
} from '@transcription/adapters'

export class PrismaTranscriptionRepository
  implements TranscriptionRepository, TranscriptionQueryRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  /** UPSERT keyed by recordingId: a retried recording REPLACES its transcript. */
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
    await this.prisma.transcription.deleteMany({ where: { recordingId } })
  }

  async findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null> {
    const row = await this.prisma.transcription.findUnique({ where: { recordingId } })
    return row ? { ...row, wordCount: row.text.split(/\s+/).filter(Boolean).length } : null
  }
}
