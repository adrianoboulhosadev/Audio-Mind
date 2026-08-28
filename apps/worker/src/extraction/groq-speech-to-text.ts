import { createReadStream } from 'fs'
import OpenAI from 'openai'
import { SpeechToTextInput, SpeechToTextProvider, SpeechToTextResult } from '@transcription/adapters'
import { ValidationError, Errors } from 'shared'
import { GroqConfig, callWithRetry, createGroqClient } from './groq-llm'
import {
  TRANSCRIPTION_SIZE_LIMIT_BYTES,
  compressForTranscription,
} from './audio-compressor'

/**
 * The speech-to-text port, implemented against Groq's Whisper endpoint — the
 * same OpenAI-compatible API (and the same API key) the summary model uses, so
 * the whole pipeline needs exactly one credential.
 *
 * `verbose_json` is what carries the detected language back; the plain `json`
 * response would only have the text, and the language is worth storing next to
 * the transcript.
 *
 * The file is re-encoded to 16 kHz mono before it goes up (see
 * audio-compressor): the endpoint's limit is 25 MB of BYTES, and sending a
 * 48 kHz stereo master spends that budget on information the model discards.
 */
export class GroqSpeechToText implements SpeechToTextProvider {
  private readonly client: OpenAI

  constructor(private readonly config: GroqConfig) {
    this.client = createGroqClient(config.apiKey)
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    const audio = await compressForTranscription(input.audioPath)
    try {
      if (audio.sentBytes > TRANSCRIPTION_SIZE_LIMIT_BYTES) {
        // Nothing to retry and nothing to fix by re-running: this audio does not
        // fit, and the user needs to be told that instead of watching a job
        // bounce. The recording itself stays in the library, playable.
        ValidationError.throwError(Errors.AUDIO_TOO_LARGE, undefined, {
          max: TRANSCRIPTION_SIZE_LIMIT_BYTES,
          size: audio.sentBytes,
        })
      }
      if (audio.compressed) {
        console.log(
          `[worker] re-encoded for transcription: ${mb(audio.originalBytes)} -> ${mb(audio.sentBytes)}`,
        )
      }

      return await this.send(audio.path, input.language)
    } finally {
      // The temporary file goes even when the call threw — a failing pipeline
      // must not also fill /tmp.
      await audio.cleanup()
    }
  }

  private async send(audioPath: string, language?: string): Promise<SpeechToTextResult> {
    const response = await callWithRetry(
      () =>
        this.client.audio.transcriptions.create({
          // A stream, not a buffer: there is no reason to hold the whole file
          // in memory to hand it to an HTTP request.
          file: createReadStream(audioPath),
          model: this.config.transcriptionModel,
          language,
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

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
