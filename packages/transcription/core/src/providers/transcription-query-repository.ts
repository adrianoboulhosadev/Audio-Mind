import { TranscriptionDTO } from '../model'

/** Transcription READ port (query side of CQRS). */
export interface TranscriptionQueryRepository {
  findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null>
  /**
   * Which of THESE recordings have a transcript mentioning `term`.
   *
   * Ids in, ids out: this context has no idea who owns a recording, so the app
   * layer hands it the caller's own ids and gets back the subset that matched.
   * That is what keeps a text search from becoming a hole that reads other
   * people's transcripts.
   */
  searchRecordingIdsQuery(term: string, recordingIds: string[], limit: number): Promise<string[]>
}
