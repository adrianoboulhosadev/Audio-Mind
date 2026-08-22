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
  createdAt: Date
}
