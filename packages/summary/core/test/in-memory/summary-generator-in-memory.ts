import { GeneratedSummary, SummaryGenerator, SummaryGeneratorInput } from '../../src'

/** Fake of the LLM port: answers whatever the test loaded and records what it
 * was asked, so a test can check the title and transcript actually reached it. */
export default class SummaryGeneratorInMemory implements SummaryGenerator {
  readonly calls: SummaryGeneratorInput[] = []

  constructor(
    private readonly result: Partial<GeneratedSummary> = {},
    private readonly failure?: Error,
  ) {}

  async generate(input: SummaryGeneratorInput): Promise<GeneratedSummary> {
    this.calls.push(input)
    if (this.failure) throw this.failure
    return {
      headline: this.result.headline ?? 'Alinhamento do time',
      overview: this.result.overview ?? 'O time revisou as entregas da semana.',
      topics: this.result.topics ?? ['Entregas da semana', 'Riscos do projeto'],
      actionItems: this.result.actionItems ?? ['Fechar o escopo até sexta'],
      model: this.result.model ?? 'llama-3.3-70b-versatile',
    }
  }
}
