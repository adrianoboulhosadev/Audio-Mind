import { SpeechToTextInput, SpeechToTextProvider, SpeechToTextResult } from '../../src'

/**
 * Fake of the speech-to-text port. Answers whatever the test loaded, and records
 * what it was asked — so a test can check the audio path/format actually reached
 * the provider, and simulate the two failure modes that matter: an empty answer
 * and a provider that throws.
 */
export default class SpeechToTextProviderInMemory implements SpeechToTextProvider {
  readonly calls: SpeechToTextInput[] = []

  constructor(
    private readonly result: Partial<SpeechToTextResult> = {},
    private readonly failure?: Error,
  ) {}

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    this.calls.push(input)
    if (this.failure) throw this.failure
    return {
      text: this.result.text ?? 'Bom dia, vamos começar a reunião.',
      language: this.result.language ?? 'pt',
      model: this.result.model ?? 'whisper-large-v3',
    }
  }
}
