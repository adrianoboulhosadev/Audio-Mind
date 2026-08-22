import { PdfRenderer, RenderSummaryPdf, SummaryRepository } from '@summary/core'

export default class RenderSummaryPdfController {
  constructor(
    private readonly repository: SummaryRepository,
    private readonly renderer: PdfRenderer,
  ) {}

  async execute(recordingId: string, recordingTitle: string): Promise<void> {
    await new RenderSummaryPdf(this.repository, this.renderer).execute({ recordingId, recordingTitle })
  }
}
