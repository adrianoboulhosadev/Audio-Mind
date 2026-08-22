import { SummaryDTO } from '../model'

/** Summary READ port (query side of CQRS). */
export interface SummaryQueryRepository {
  findByRecordingQuery(recordingId: string): Promise<SummaryDTO | null>
}
