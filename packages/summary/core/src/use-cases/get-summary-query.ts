import { UseCase, NotFoundError, Errors } from 'shared'
import { SummaryDTO } from '../model'
import { SummaryQueryRepository } from '../providers'

/**
 * The summary of one recording. No owner check here: this context knows nothing
 * about who owns a recording — the backend resolves ownership against the
 * recording first and only then asks for the summary (same cross-context shape
 * used everywhere else).
 */
export default class GetSummaryQuery implements UseCase<string, SummaryDTO> {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute(recordingId: string): Promise<SummaryDTO> {
    const summary = await this.queryRepository.findByRecordingQuery(recordingId)
    if (!summary) NotFoundError.throwError(Errors.SUMMARY_NOT_FOUND, recordingId)

    return summary
  }
}
