import {
  Annotation,
  AnnotationDTO,
  AnnotationQueryRepository,
  AnnotationRepository,
} from '../../src'

interface AnnotationRow {
  id: string
  ownerId: string
  recordingId: string
  atSeconds: number
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export default class AnnotationRepositoryInMemory
  implements AnnotationRepository, AnnotationQueryRepository
{
  private rows: AnnotationRow[] = []

  private serialize(annotation: Annotation): AnnotationRow {
    return {
      id: annotation.id.value,
      ownerId: annotation.ownerId,
      recordingId: annotation.recordingId,
      atSeconds: annotation.at.value,
      note: annotation.note?.value ?? null,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
    }
  }

  async create(annotation: Annotation): Promise<void> {
    this.rows.push(this.serialize(annotation))
  }

  async findById(id: string): Promise<Annotation | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? new Annotation({ ...row }) : null
  }

  async update(annotation: Annotation): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === annotation.id.value)
    if (index >= 0) this.rows[index] = this.serialize(annotation)
  }

  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id)
  }

  async deleteByRecording(recordingId: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.recordingId !== recordingId)
  }

  async listByRecordingQuery(recordingId: string): Promise<AnnotationDTO[]> {
    return this.rows
      .filter((row) => row.recordingId === recordingId)
      .sort((first, second) => first.atSeconds - second.atSeconds)
      .map((row) => ({ ...row }))
  }

  async listByOwnerQuery(ownerId: string, limit: number): Promise<AnnotationDTO[]> {
    return this.rows
      .filter((row) => row.ownerId === ownerId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({ ...row }))
  }

  get size(): number {
    return this.rows.length
  }
}
