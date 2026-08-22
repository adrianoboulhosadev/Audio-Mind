import { UseCase } from 'shared'
import { Summary } from '../model'
import { SummaryGenerator, SummaryRepository } from '../providers'

interface Input {
  recordingId: string
  /** Both come from other contexts, handed over as plain data by the app layer
   * (the worker) — summary imports neither recording nor transcription. */
  recordingTitle: string
  transcript: string
  language?: string
}

/**
 * Asks the LLM for the summary and stores what came back.
 *
 * The use case only orchestrates. Everything that decides whether the answer IS
 * a summary — a headline, prose, bullets that are sentences and not a wall —
 * belongs to the value objects the entity builds, so a model that returns junk
 * throws here and the worker turns it into a failed recording, instead of
 * saving a summary nobody can read.
 */
export default class SummarizeTranscript implements UseCase<Input, void> {
  constructor(
    private readonly repository: SummaryRepository,
    private readonly generator: SummaryGenerator,
  ) {}

  async execute({ recordingId, recordingTitle, transcript, language }: Input): Promise<void> {
    const generated = await this.generator.generate({ recordingTitle, transcript, language })

    const summary = new Summary({
      recordingId,
      headline: generated.headline,
      overview: generated.overview,
      topics: generated.topics,
      actionItems: generated.actionItems,
      model: generated.model,
    })

    await this.repository.save(summary)
  }
}
