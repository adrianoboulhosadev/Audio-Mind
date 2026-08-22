import { createReadStream } from 'fs'
import OpenAI from 'openai'
import { SpeechToTextInput, SpeechToTextProvider, SpeechToTextResult } from '@transcription/adapters'
import { GroqConfig, callWithRetry, createGroqClient } from './groq-llm'

/**
 * The speech-to-text port, implemented against Groq's Whisper endpoint — the
 * same OpenAI-compatible API (and the same API key) the summary model uses, so
 * the whole pipeline needs exactly one credential.
 *
 * `verbose_json` is what carries the detected language back; the plain `json`
 * response would only have the text, and the language is worth storing next to
 * the transcript.
 */
export class GroqSpeechToText implements SpeechToTextProvider {
  private readonly client: OpenAI

  constructor(private readonly config: GroqConfig) {
    this.client = createGroqClient(config.apiKey)
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    const response = await callWithRetry(
      () =>
        this.client.audio.transcriptions.create({
          // A stream, not a buffer: the file can be 25 MB and there is no
          // reason to hold all of it in memory to hand it to an HTTP request.
          file: createReadStream(input.audioPath),
          model: this.config.transcriptionModel,
          language: input.language,
          response_format: 'verbose_json',
        }),
      'transcription',
    )

    // The SDK types this endpoint by the plain shape; verbose_json adds the
    // language, so it is read defensively rather than asserted.
    const verbose = response as { text?: string; language?: string }

    return {
      // An empty answer is NOT patched over here: the TranscriptText value
      // object refuses it, and the pipeline turns that into a failed recording
      // with a reason the user can act on.
      text: verbose.text ?? '',
      language: verbose.language ?? null,
      model: this.config.transcriptionModel,
    }
  }
}
