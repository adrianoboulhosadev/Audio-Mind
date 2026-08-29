import {
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
} from '../../src'

interface TranscriptionRow {
  id: string
  recordingId: string
  text: string
  language: string | null
  model: string
  // Serialized exactly like the Json column: the provider's keys, so the
  // reconstitution below is the same round-trip the Prisma repository does.
  segments: { start: number; end: number; text: string }[]
  createdAt: Date
}

/** Fake of the transcriptions table. `save` upserts by recordingId, exactly like
 * the Prisma adapter — that unique key is what keeps a retry from duplicating. */
export default class TranscriptionRepositoryInMemory
  implements TranscriptionRepository, TranscriptionQueryRepository
{
  private rows: TranscriptionRow[] = []

  async save(transcription: Transcription): Promise<void> {
    const row: TranscriptionRow = {
      id: transcription.id.value,
      recordingId: transcription.recordingId,
      text: transcription.text.value,
      language: transcription.language,
      model: transcription.model,
      segments: transcription.segments.map((segment) => ({
        start: segment.startSeconds,
        end: segment.endSeconds,
        text: segment.text,
      })),
      createdAt: transcription.createdAt,
    }
    const index = this.rows.findIndex((current) => current.recordingId === row.recordingId)
    if (index >= 0) this.rows[index] = row
    else this.rows.push(row)
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    const row = this.rows.find((current) => current.recordingId === recordingId)
    return row ? new Transcription({ ...row }) : null
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.recordingId !== recordingId)
  }

  async findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null> {
    const row = this.rows.find((current) => current.recordingId === recordingId)
    if (!row) return null
    return {
      ...row,
      wordCount: row.text.split(/\s+/).filter(Boolean).length,
      segments: row.segments.map((segment) => ({
        startSeconds: segment.start,
        endSeconds: segment.end,
        text: segment.text,
      })),
    }
  }

  get size(): number {
    return this.rows.length
  }
}
