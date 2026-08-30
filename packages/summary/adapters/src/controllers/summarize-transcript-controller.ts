import { SummarizeTranscript, SummaryGenerator, SummaryRepository } from '@summary/core'

export default class SummarizeTranscriptController {
  constructor(
    private readonly repository: SummaryRepository,
    private readonly generator: SummaryGenerator,
  ) {}

  async execute(input: {
    recordingId: string
    recordingTitle: string
    transcript: string
    kind?: string
    language?: string
  }): Promise<void> {
    await new SummarizeTranscript(this.repository, this.generator).execute(input)
  }
}
