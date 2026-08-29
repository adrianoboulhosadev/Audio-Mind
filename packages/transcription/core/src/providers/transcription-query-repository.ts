import { TranscriptionDTO, TranscriptMatchDTO } from '../model'

/** Transcription READ port (query side of CQRS). */
export interface TranscriptionQueryRepository {
  findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null>
  /**
   * Which of THESE recordings were talking about `term`, and WHERE.
   *
   * Ids in, matches out: this context has no idea who owns a recording, so the
   * app layer hands it the caller's own ids and gets back the subset that
   * matched — each one with the stretch that matched and the second it was said,
   * which is what turns "achei o áudio" into "achei o momento".
   */
  searchMatchesQuery(
    term: string,
    recordingIds: string[],
    limit: number,
  ): Promise<TranscriptMatchDTO[]>
}
