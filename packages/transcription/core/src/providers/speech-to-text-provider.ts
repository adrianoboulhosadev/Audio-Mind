export interface SpeechToTextInput {
  /** ABSOLUTE path of the audio on disk. The domain never resolves it — the app
   * layer (worker) knows where the uploads root is and hands it over, the same
   * way the backend hands over any other cross-context fact. */
  audioPath: string
  mimeType: string
  /** Hint for the model ("pt"). Optional: left out, the model detects it. */
  language?: string
}

export interface SpeechToTextResult {
  text: string
  language: string | null
  /** Which model actually answered — stored with the transcript. */
  model: string
}

/**
 * Speech-to-text port, implemented in apps/worker by Groq's Whisper endpoint.
 * The domain knows only "audio in, text out": which provider, which model and
 * how retries work are infrastructure decisions that live in the adapter.
 */
export interface SpeechToTextProvider {
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>
}
