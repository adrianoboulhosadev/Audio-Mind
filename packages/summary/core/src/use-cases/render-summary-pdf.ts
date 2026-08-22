import { UseCase, NotFoundError, Errors } from 'shared'
import { PdfRenderer, SummaryRepository } from '../providers'

interface Input {
  recordingId: string
  /** The audio's title, for the PDF's cover line — it belongs to the recording
   * context, so the app layer hands it over. */
  recordingTitle: string
}

/**
 * Renders the stored summary as a PDF and attaches its path.
 *
 * A SEPARATE use case from SummarizeTranscript on purpose: the summary is the
 * product, the PDF is a rendering of it. Keeping them apart means a failure
 * while drawing the document does not throw away the text the model already
 * produced — the summary stays readable on screen, and the PDF can be rendered
 * again later.
 */
export default class RenderSummaryPdf implements UseCase<Input, void> {
  constructor(
    private readonly repository: SummaryRepository,
    private readonly renderer: PdfRenderer,
  ) {}

  async execute({ recordingId, recordingTitle }: Input): Promise<void> {
    const summary = await this.repository.findByRecording(recordingId)
    if (!summary) NotFoundError.throwError(Errors.SUMMARY_NOT_FOUND, recordingId)

    const pdfUrl = await this.renderer.render({
      recordingId,
      recordingTitle,
      headline: summary.headline.value,
      overview: summary.overview.value,
      topics: summary.topics.map((topic) => topic.value),
      actionItems: summary.actionItems.map((item) => item.value),
      createdAt: summary.createdAt,
    })

    summary.attachPdf(pdfUrl)
    await this.repository.update(summary)
  }
}
