import { UseCase } from 'shared'
import { SummaryRepository } from '../providers'

/**
 * Drops the summary of a recording. Idempotent — deleting what is not there is
 * a no-op, because this runs as part of the app layer's delete cascade and a
 * recording that failed before being summarized simply has none.
 */
export default class DeleteSummary implements UseCase<string, void> {
  constructor(private readonly repository: SummaryRepository) {}

  async execute(recordingId: string): Promise<void> {
    await this.repository.deleteByRecording(recordingId)
  }
}
