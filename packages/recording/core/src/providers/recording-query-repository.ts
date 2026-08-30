import { LibraryStatsDTO, OwnerUsageDTO, RecordingDTO } from '../model'

/** Recording READ port (query side of CQRS). */
export interface RecordingQueryRepository {
  /** The owner's library, newest first, capped at `limit`. */
  listByOwnerQuery(ownerId: string, limit: number): Promise<RecordingDTO[]>
  findByIdQuery(id: string): Promise<RecordingDTO | null>
  /**
   * SYSTEM reads, with no owner anywhere in them — they answer for the whole
   * installation, which is what an administrator's screen is about.
   *
   * They are separate methods rather than an optional `ownerId?` on the ones
   * above, for the same reason `GetRecordingForProcessingQuery` is a separate
   * use case: an optional owner is one forgotten argument away from turning an
   * ordinary route into an unguarded read of everybody's library.
   */
  statsQuery(): Promise<LibraryStatsDTO>
  listFailedQuery(limit: number): Promise<RecordingDTO[]>
  usageByOwnersQuery(ownerIds: string[]): Promise<OwnerUsageDTO[]>
  /**
   * Every id this owner has — no cap, on purpose. It is what lets the app layer
   * ask the OTHER contexts "which of these recordings mention this word?"
   * without any of them learning who owns what. Uncapped is fine here and
   * nowhere else: the cap on the listing exists to bound the size of the DTOs
   * it returns, and this returns identifiers.
   */
  listAllIdsByOwnerQuery(ownerId: string): Promise<string[]>
  /**
   * These recordings, and only the ones this owner actually has.
   *
   * It exists for the reverse of the search: a DERIVED context (a task, an
   * annotation) hands over the recording ids it stored, and this answers with
   * the rows they belong to, so a screen can say WHICH audio each line came
   * from. Owner-scoped in the query itself, so an id that leaked from anywhere
   * still cannot read someone else's row.
   */
  listByIdsQuery(ownerId: string, ids: string[]): Promise<RecordingDTO[]>
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
