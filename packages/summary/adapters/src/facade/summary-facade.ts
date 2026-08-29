import {
  PdfRenderer,
  SummaryDTO,
  SummaryGenerator,
  SummaryQueryRepository,
  SummaryRepository,
} from '@summary/core'
import {
  DeleteSummaryController,
  GetSummaryController,
  SearchSummariesController,
  GetSummaryPdfController,
  RenderSummaryPdfController,
  SummarizeTranscriptController,
} from '../controllers'

/**
 * Single entry point the apps call: the worker writes (summarize + render), the
 * backend reads and deletes. Optional ports — the backend wires neither the LLM
 * nor the PDF renderer, because neither belongs in an HTTP request.
 */
export default class SummaryFacade {
  constructor(
    private readonly repository?: SummaryRepository,
    private readonly queryRepository?: SummaryQueryRepository,
    private readonly generator?: SummaryGenerator,
    private readonly renderer?: PdfRenderer,
  ) {}

  async summarizeTranscript(input: {
    recordingId: string
    recordingTitle: string
    transcript: string
    language?: string
  }): Promise<void> {
    await new SummarizeTranscriptController(this.repository!, this.generator!).execute(input)
  }

  async renderSummaryPdf(recordingId: string, recordingTitle: string): Promise<void> {
    await new RenderSummaryPdfController(this.repository!, this.renderer!).execute(
      recordingId,
      recordingTitle,
    )
  }

  async getSummary(recordingId: string): Promise<SummaryDTO> {
    return new GetSummaryController(this.queryRepository!).execute(recordingId)
  }

  /** Which of THESE recordings have a summary mentioning the term. Ids in, ids
   * out — this context never learns who owns them. */
  async searchSummaries(term: string, recordingIds: string[], limit?: number): Promise<string[]> {
    return new SearchSummariesController(this.queryRepository!).execute(term, recordingIds, limit)
  }

  async getSummaryPdf(recordingId: string): Promise<string> {
    return new GetSummaryPdfController(this.queryRepository!).execute(recordingId)
  }

  async deleteSummary(recordingId: string): Promise<void> {
    await new DeleteSummaryController(this.repository!).execute(recordingId)
  }
}
