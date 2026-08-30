import {
  Recording,
  RecordingDTO,
  RecordingQueryRepository,
  RecordingKind,
  RecordingRepository,
  RecordingSource,
  RecordingStatus,
} from '../../src'

/**
 * Simulates the database TABLE. Writes SERIALIZE the entity (reading its value
 * objects); reads RECONSTITUTE it through the constructor — the same round-trip
 * the real Prisma repository does. The query side projects the plain DTO.
 */
interface RecordingRow {
  id: string
  ownerId: string
  title: string
  kind: RecordingKind
  source: RecordingSource
  audioUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
  status: RecordingStatus
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export default class RecordingRepositoryInMemory
  implements RecordingRepository, RecordingQueryRepository
{
  private rows: RecordingRow[] = []

  private serialize(recording: Recording): RecordingRow {
    return {
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
    }
  }

  private reconstitute(row: RecordingRow): Recording {
    return new Recording({ ...row })
  }

  async create(recording: Recording): Promise<void> {
    this.rows.push(this.serialize(recording))
  }

  async findById(id: string): Promise<Recording | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async update(recording: Recording): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === recording.id.value)
    if (index >= 0) this.rows[index] = this.serialize(recording)
  }

  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((current) => current.id !== id)
  }

  async listByOwnerQuery(ownerId: string, limit: number): Promise<RecordingDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({ ...row }))
  }

  async listAllIdsByOwnerQuery(ownerId: string): Promise<string[]> {
    return this.rows.filter((row) => row.ownerId === ownerId).map((row) => row.id)
  }

  async listByIdsQuery(ownerId: string, ids: string[]): Promise<RecordingDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId && ids.includes(row.id))
      .map((row) => ({ ...row }))
  }

  // Same shape as the SQL: title match OR one of the ids another context
  // matched, always inside this owner's rows, newest first.
  async searchByOwnerQuery(
    ownerId: string,
    term: string,
    alsoIds: string[],
    limit: number,
  ): Promise<RecordingDTO[]> {
    const lowered = term.toLowerCase()
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .filter(
        (row) =>
          (Boolean(term) && row.title.toLowerCase().includes(lowered)) || alsoIds.includes(row.id),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({ ...row }))
  }

  async findByIdQuery(id: string): Promise<RecordingDTO | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? { ...row } : null
  }

  get size(): number {
    return this.rows.length
  }
}
