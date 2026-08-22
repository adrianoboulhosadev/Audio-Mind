import { SpeechToTextProvider } from '@transcription/adapters'
import { SummaryGenerator } from '@summary/adapters'
import { GroqConfig } from './groq-llm'
import { GroqSpeechToText } from './groq-speech-to-text'
import { GroqSummaryGenerator } from './groq-summary-generator'

export { createGroqClient, callWithRetry } from './groq-llm'
export type { GroqConfig } from './groq-llm'
export { toGeneratedSummary } from './summary-mapper'
export type { LlmSummaryRecord } from './summary-mapper'

/** Both factories throw when the key is missing (fail-closed) — the worker does
 * not start half-able to process, it does not start at all. */
export function createSpeechToText(config: GroqConfig): SpeechToTextProvider {
  return new GroqSpeechToText(config)
}

export function createSummaryGenerator(config: GroqConfig): SummaryGenerator {
  return new GroqSummaryGenerator(config)
}
