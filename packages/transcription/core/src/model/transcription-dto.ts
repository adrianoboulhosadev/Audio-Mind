/**
 * One stretch of speech in the READ projection. Plain numbers and text: the
 * front turns `startSeconds` into a timestamp to show and into the second it
 * asks the player to jump to.
 */
export interface TranscriptSegmentDTO {
  startSeconds: number
  endSeconds: number
  text: string
}

/**
 * READ projection (CQRS) of a transcript. `wordCount` is computed on the read
 * side — it is a display fact, not something worth a column that could drift
 * from the text next to it.
 */
export interface TranscriptionDTO {
  id: string
  recordingId: string
  text: string
  language: string | null
  model: string
  wordCount: number
  /** Empty for a transcript recorded before the timestamps existed, or when the
   * model did not return any — the screen falls back to the plain text. */
  segments: TranscriptSegmentDTO[]
  createdAt: Date
}
