import { UseCase, NotFoundError, Errors } from 'shared'
import { SummaryQueryRepository } from '../providers'

/**
 * Where the summary's PDF lives, for the download route.
 *
 * A summary WITHOUT a rendered PDF is a real state (the text was generated, the
 * drawing step failed or has not run), and it answers PDF_NOT_AVAILABLE rather
 * than "not found" — the difference tells the user their summary is fine and
 * only the file is missing.
 */
export default class GetSummaryPdfQuery implements UseCase<string, string> {
  constructor(private readonly queryRepository: SummaryQueryRepository) {}

  async execute(recordingId: string): Promise<string> {
    const summary = await this.queryRepository.findByRecordingQuery(recordingId)
    if (!summary) NotFoundError.throwError(Errors.SUMMARY_NOT_FOUND, recordingId)
    if (!summary.pdfUrl) NotFoundError.throwError(Errors.PDF_NOT_AVAILABLE, recordingId)

    return summary.pdfUrl
  }
}
