import { RecordingDTO } from '../model'

/** Recording READ port (query side of CQRS). */
export interface RecordingQueryRepository {
  /** The owner's library, newest first, capped at `limit`. */
  listByOwnerQuery(ownerId: string, limit: number): Promise<RecordingDTO[]>
  findByIdQuery(id: string): Promise<RecordingDTO | null>
  /**
   * Every id this owner has — no cap, on purpose. It is what lets the app layer
   * ask the OTHER contexts "which of these recordings mention this word?"
   * without any of them learning who owns what. Uncapped is fine here and
   * nowhere else: the cap on the listing exists to bound the size of the DTOs
   * it returns, and this returns identifiers.
   */
  listAllIdsByOwnerQuery(ownerId: string): Promise<string[]>
  /**
   * The owner's recordings whose TITLE matches `term`, plus the ones named in
   * `alsoIds` — the ids the derived contexts matched by their own text. One
   * query, because ownership and ordering are this context's job and doing it
   * anywhere else would mean filtering someone else's rows in the app layer.
   */
  searchByOwnerQuery(
    ownerId: string,
    term: string,
    alsoIds: string[],
    limit: number,
  ): Promise<RecordingDTO[]>
}
