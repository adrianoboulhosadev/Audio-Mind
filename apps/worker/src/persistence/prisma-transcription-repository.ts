import { PrismaClient } from 'database'
import {
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
  TranscriptSegmentDTO,
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
      segments: toSegmentRows(transcription),
    }
    await this.prisma.transcription.upsert({
      where: { recordingId: transcription.recordingId },
      create: { id: transcription.id.value, recordingId: transcription.recordingId, ...data },
      update: data,
    })
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    const row = await this.prisma.transcription.findUnique({ where: { recordingId } })
    return row ? new Transcription({ ...row, segments: toSegmentInputs(row.segments) }) : null
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    await this.prisma.transcription.deleteMany({ where: { recordingId } })
  }

  async findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null> {
    const row = await this.prisma.transcription.findUnique({ where: { recordingId } })
    if (!row) return null
    return {
      ...row,
      wordCount: row.text.split(/\s+/).filter(Boolean).length,
      segments: toSegmentDTOs(row.segments),
    }
  }
}

/**
 * The stored segments, shape-guarded. They are validated on the WRITE side (the
 * TranscriptSegment value object), so reading only has to survive a row written
 * by an older version — where the column is simply null.
 */
function toSegmentDTOs(value: unknown): TranscriptSegmentDTO[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (raw): raw is { start: number; end: number; text: string } =>
        typeof raw === 'object' &&
        raw !== null &&
        typeof (raw as { text?: unknown }).text === 'string',
    )
    .map((raw) => ({ startSeconds: raw.start, endSeconds: raw.end, text: raw.text }))
}

/** How the segments go INTO the column: the same keys the provider uses, so the
 * entity reconstitutes from the row without a translation step. */
function toSegmentRows(transcription: Transcription) {
  return transcription.segments.map((segment) => ({
    start: segment.startSeconds,
    end: segment.endSeconds,
    text: segment.text,
  }))
}

/** The stored array as the ENTITY takes it. No validation here on purpose: the
 * entity parses each one and drops what does not fit, so this only has to
 * answer "is this a list at all". */
function toSegmentInputs(value: unknown): { start?: number; end?: number; text?: string }[] {
  return Array.isArray(value) ? (value as { start?: number; end?: number; text?: string }[]) : []
}
