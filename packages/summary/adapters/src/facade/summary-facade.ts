import {
  AskedAnswerDTO,
  PdfRenderer,
  SummaryDTO,
  SummaryGenerator,
  SummaryQueryRepository,
  SummaryRepository,
  TranscriptQuestionAnswerer,
} from '@summary/core'
import {
  AskAboutTranscriptController,
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
    // Only the backend wires this one: asking a question happens inside an HTTP
    // request, which is the opposite of everything else in this context.
    private readonly answerer?: TranscriptQuestionAnswerer,
  ) {}

  async summarizeTranscript(input: {
    recordingId: string
    recordingTitle: string
    transcript: string
    kind?: string
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

  /** Answers a question about ONE recording from its transcript. Stores
   * nothing — it is a conversation about the audio, not a fact about it. */
  async askAboutTranscript(input: {
    recordingTitle: string
    transcript: string
    question: string
    language?: string
  }): Promise<AskedAnswerDTO> {
    return new AskAboutTranscriptController(this.answerer!).execute(input)
  }

  async deleteSummary(recordingId: string): Promise<void> {
    await new DeleteSummaryController(this.repository!).execute(recordingId)
  }
}
