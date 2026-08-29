import { Injectable } from '@nestjs/common'
import {
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
  TranscriptSegmentDTO,
  TranscriptMatchDTO,
  findTranscriptMatch,
} from '@transcription/adapters'
import { PrismaService } from '../db/prisma.service'

interface TranscriptionRow {
  id: string
  recordingId: string
  text: string
  language: string | null
  model: string
  segments: unknown
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
    if (!row) return null
    // The entity drops whatever does not parse, so the column can be null or
    // hold a row written before the segments existed.
    return new Transcription({ ...row, segments: toSegmentInputs(row.segments) })
  }

  /**
   * The subset of `recordingIds` whose transcript mentions the term, each with
   * the stretch that matched and the second it was said.
   *
   * Two steps on purpose: SQL says which rows mention it (ILIKE — no column, no
   * index, no dictionary, and the id list already bounds the scan to one
   * person's library), and the domain function says where in each row. Finding
   * the segment in SQL would mean querying inside a JSON column for something
   * the context already knows how to answer.
   */
  async searchMatchesQuery(
    term: string,
    recordingIds: string[],
    limit: number,
  ): Promise<TranscriptMatchDTO[]> {
    const rows = await this.prisma.transcription.findMany({
      where: { recordingId: { in: recordingIds }, text: { contains: term, mode: 'insensitive' } },
      select: { recordingId: true, text: true, segments: true },
      take: limit,
    })

    return rows.map((row) => {
      const match = findTranscriptMatch(row.text, toSegmentDTOs(row.segments), term)
      return {
        recordingId: row.recordingId,
        excerpt: match?.excerpt ?? '',
        startSeconds: match?.startSeconds ?? null,
      }
    })
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
