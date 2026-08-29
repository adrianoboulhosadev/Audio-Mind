export interface TranscriptQuestionInput {
  /** What the user called the audio — the model gets the subject, same as when
   * it writes the summary. */
  recordingTitle: string
  transcript: string
  question: string
  /** Language the ANSWER must be written in (not the audio's). */
  language?: string
}

export interface TranscriptAnswer {
  text: string
  /** Which model actually answered — shown next to the answer, because the
   * model that spoke is part of what the answer is worth. */
  model: string
}

/**
 * Answering a question ABOUT one transcript, implemented in apps/backend
 * against the same Groq chat models the worker uses for the summary.
 *
 * It lives in this context because "what the LLM wrote about this recording" is
 * exactly what `summary` is — the only difference from the stored summary is
 * that nobody asked for this one in advance, so nothing is persisted.
 *
 * Unlike the pipeline's two steps, this one runs INSIDE an HTTP request: it is
 * a few seconds and the user is sitting there waiting for it, which is a very
 * different thing from transcribing an hour of audio.
 */
export interface TranscriptQuestionAnswerer {
  answer(input: TranscriptQuestionInput): Promise<TranscriptAnswer>
}
