import { Summary } from '../model'

/**
 * Summary WRITE port (command side).
 *
 * `save` must be an UPSERT keyed by recordingId, for the same reason the
 * transcript's is: retrying a recording regenerates the summary, and the second
 * run REPLACES the first rather than adding a row the unique index would refuse.
 */
export interface SummaryRepository {
  save(summary: Summary): Promise<void>
  findByRecording(recordingId: string): Promise<Summary | null>
  update(summary: Summary): Promise<void>
  deleteByRecording(recordingId: string): Promise<void>
}
