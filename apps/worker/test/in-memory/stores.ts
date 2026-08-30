import {
  Recording,
  RecordingDTO,
  RecordingQueryRepository,
  RecordingRepository,
} from '@recording/adapters'
import {
  SpeechToTextInput,
  SpeechToTextProvider,
  SpeechToTextResult,
  Transcription,
  TranscriptionDTO,
  TranscriptionQueryRepository,
  TranscriptionRepository,
} from '@transcription/adapters'
import {
  GeneratedSummary,
  PdfRenderer,
  PdfRendererInput,
  Summary,
  SummaryDTO,
  SummaryGenerator,
  SummaryGeneratorInput,
  SummaryQueryRepository,
  SummaryRepository,
} from '@summary/adapters'
import { Task, TaskDTO, TaskQueryRepository, TaskRepository } from '@task/adapters'

/**
 * In-memory doubles of the ports the pipeline drives, so `processRecording` can
 * be exercised end to end without Postgres, Redis, Groq or a disk — the thing
 * being tested is the ORDER and the resumability, not the adapters.
 */

export class RecordingStore implements RecordingRepository, RecordingQueryRepository {
  private rows = new Map<string, RecordingDTO>()

  seed(row: RecordingDTO): void {
    this.rows.set(row.id, row)
  }

  get(id: string): RecordingDTO {
    return this.rows.get(id)!
  }

  async create(recording: Recording): Promise<void> {
    await this.update(recording)
  }

  async findById(id: string): Promise<Recording | null> {
    const row = this.rows.get(id)
    return row ? new Recording({ ...row }) : null
  }

  async update(recording: Recording): Promise<void> {
    this.rows.set(recording.id.value, {
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
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    })
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id)
  }

  async listByOwnerQuery(ownerId: string): Promise<RecordingDTO[]> {
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId)
  }

  async findByIdQuery(id: string): Promise<RecordingDTO | null> {
    return this.rows.get(id) ?? null
  }

  // The worker never searches; these exist because the READ port is one
  // interface, and the pipeline tests only ever go through the two above.
  async listAllIdsByOwnerQuery(ownerId: string): Promise<string[]> {
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId).map((row) => row.id)
  }

  async searchByOwnerQuery(ownerId: string): Promise<RecordingDTO[]> {
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId)
  }

  async listByIdsQuery(ownerId: string, ids: string[]): Promise<RecordingDTO[]> {
    return [...this.rows.values()].filter((row) => row.ownerId === ownerId && ids.includes(row.id))
  }
}

export class TranscriptionStore implements TranscriptionRepository, TranscriptionQueryRepository {
  private rows = new Map<string, TranscriptionDTO>()

  async save(transcription: Transcription): Promise<void> {
    this.rows.set(transcription.recordingId, {
      id: transcription.id.value,
      recordingId: transcription.recordingId,
      text: transcription.text.value,
      language: transcription.language,
      model: transcription.model,
      wordCount: transcription.text.wordCount,
      segments: transcription.segments.map((segment) => ({
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
      })),
      createdAt: transcription.createdAt,
    })
  }

  async findByRecording(recordingId: string): Promise<Transcription | null> {
    const row = this.rows.get(recordingId)
    return row ? new Transcription({ ...row }) : null
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows.delete(recordingId)
  }

  async findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null> {
    return this.rows.get(recordingId) ?? null
  }

  // Searching is a backend feature; the port is shared, so the store answers it
  // honestly and the pipeline tests never call it.
  async searchMatchesQuery(term: string, recordingIds: string[]) {
    return [...this.rows.values()]
      .filter((row) => recordingIds.includes(row.recordingId) && row.text.includes(term))
      .map((row) => ({ recordingId: row.recordingId, excerpt: row.text, startSeconds: null }))
  }
}

export class SummaryStore implements SummaryRepository, SummaryQueryRepository {
  private rows = new Map<string, SummaryDTO>()

  private serialize(summary: Summary): SummaryDTO {
    return {
      id: summary.id.value,
      recordingId: summary.recordingId,
      headline: summary.headline.value,
      overview: summary.overview.value,
      topics: summary.topics.map((topic) => topic.value),
      actionItems: summary.actionItems.map((item) => item.value),
      model: summary.model,
      pdfUrl: summary.pdfUrl,
      createdAt: summary.createdAt,
    }
  }

  async save(summary: Summary): Promise<void> {
    this.rows.set(summary.recordingId, this.serialize(summary))
  }

  async findByRecording(recordingId: string): Promise<Summary | null> {
    const row = this.rows.get(recordingId)
    return row ? new Summary({ ...row }) : null
  }

  async update(summary: Summary): Promise<void> {
    this.rows.set(summary.recordingId, this.serialize(summary))
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows.delete(recordingId)
  }

  async findByRecordingQuery(recordingId: string): Promise<SummaryDTO | null> {
    return this.rows.get(recordingId) ?? null
  }

  async searchRecordingIdsQuery(term: string, recordingIds: string[]): Promise<string[]> {
    return [...this.rows.values()]
      .filter((row) => recordingIds.includes(row.recordingId) && row.headline.includes(term))
      .map((row) => row.recordingId)
  }
}

/**
 * The tasks the pipeline materializes, with the same unique (recordingId, text)
 * the table has — without it a test would pass on the duplicate a re-processed
 * recording would produce, which is the exact thing this table exists to stop.
 */
export class TaskStore implements TaskRepository, TaskQueryRepository {
  private rows: { id: string; ownerId: string; recordingId: string; text: string; doneAt: Date | null; createdAt: Date }[] = []

  get texts(): string[] {
    return this.rows.map((row) => row.text)
  }

  async findById(id: string): Promise<Task | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? new Task({ ...row }) : null
  }

  async update(task: Task): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === task.id.value)
    if (index >= 0) this.rows[index].doneAt = task.doneAt
  }

  async createMany(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      const duplicate = this.rows.some(
        (row) => row.recordingId === task.recordingId && row.text === task.text.value,
      )
      if (duplicate) continue
      this.rows.push({
        id: task.id.value,
        ownerId: task.ownerId,
        recordingId: task.recordingId,
        text: task.text.value,
        doneAt: task.doneAt,
        createdAt: task.createdAt,
      })
    }
  }

  async deletePendingByRecordingExcept(recordingId: string, keep: string[]): Promise<void> {
    this.rows = this.rows.filter(
      (row) => row.recordingId !== recordingId || row.doneAt !== null || keep.includes(row.text),
    )
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.recordingId !== recordingId)
  }

  async listByOwnerQuery(ownerId: string): Promise<TaskDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .map((row) => ({
        id: row.id,
        recordingId: row.recordingId,
        text: row.text,
        doneAt: row.doneAt,
        createdAt: row.createdAt,
      }))
  }

  async countPendingQuery(ownerId: string): Promise<number> {
    return this.rows.filter((row) => row.ownerId === ownerId && row.doneAt === null).length
  }
}

export class FakeSpeechToText implements SpeechToTextProvider {
  readonly calls: SpeechToTextInput[] = []

  constructor(
    private readonly text = 'Bom dia, vamos revisar as entregas.',
    private readonly failure?: Error,
  ) {}

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    this.calls.push(input)
    if (this.failure) throw this.failure
    return { text: this.text, language: 'pt', model: 'whisper-large-v3' }
  }
}

export class FakeSummaryGenerator implements SummaryGenerator {
  readonly calls: SummaryGeneratorInput[] = []

  constructor(
    private readonly failure?: Error,
    private readonly actionItems: string[] = [],
  ) {}

  async generate(input: SummaryGeneratorInput): Promise<GeneratedSummary> {
    this.calls.push(input)
    if (this.failure) throw this.failure
    return {
      headline: 'Revisão de entregas',
      overview: 'O time revisou as entregas da semana.',
      topics: ['Entregas'],
      actionItems: this.actionItems,
      model: 'openai/gpt-oss-120b',
    }
  }
}

export class FakePdfRenderer implements PdfRenderer {
  readonly calls: PdfRendererInput[] = []

  async render(input: PdfRendererInput): Promise<string> {
    this.calls.push(input)
    return `/uploads/summaries/${input.recordingId}.pdf`
  }
}
