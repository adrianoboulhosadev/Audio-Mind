export interface SummaryGeneratorInput {
  /** What the user called the audio — it gives the model the subject, which a
   * bare transcript often does not state. */
  recordingTitle: string
  transcript: string
  /**
   * What KIND of audio it is, as the recording context spells it ('meeting',
   * 'class'…). This context does NOT interpret it — it travels as opaque data
   * to the adapter, which is where the per-kind instructions live, exactly like
   * the model id and the retry policy. Absent means the generic template.
   */
  kind?: string
  /** Language the summary must be WRITTEN in (not the audio's). */
  language?: string
}

export interface GeneratedSummary {
  headline: string
  overview: string
  topics: string[]
  actionItems: string[]
  /** Which model actually answered — stored with the summary. */
  model: string
}

/**
 * The LLM port, implemented in apps/worker against Groq. The domain knows only
 * "transcript in, structured summary out": the prompt, the model id, the JSON
 * mode and the retry policy are infrastructure decisions that live in the
 * adapter, exactly like the speech-to-text port next door.
 */
export interface SummaryGenerator {
  generate(input: SummaryGeneratorInput): Promise<GeneratedSummary>
}
