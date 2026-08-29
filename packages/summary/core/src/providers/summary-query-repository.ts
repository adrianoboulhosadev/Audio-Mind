import { SummaryDTO } from '../model'

/** Summary READ port (query side of CQRS). */
export interface SummaryQueryRepository {
  findByRecordingQuery(recordingId: string): Promise<SummaryDTO | null>
  /**
   * Which of THESE recordings have a summary mentioning `term` — headline,
   * overview or one of the bullets.
   *
   * Ids in, ids out, same as the transcript search: this context knows nothing
   * about owners, so the app layer hands it the caller's own ids.
   */
  searchRecordingIdsQuery(term: string, recordingIds: string[], limit: number): Promise<string[]>
}
