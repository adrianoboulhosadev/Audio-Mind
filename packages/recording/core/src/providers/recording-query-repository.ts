import { RecordingDTO } from '../model'

/** Recording READ port (query side of CQRS). */
export interface RecordingQueryRepository {
  /** The owner's library, newest first, capped at `limit`. */
  listByOwnerQuery(ownerId: string, limit: number): Promise<RecordingDTO[]>
  findByIdQuery(id: string): Promise<RecordingDTO | null>
}
