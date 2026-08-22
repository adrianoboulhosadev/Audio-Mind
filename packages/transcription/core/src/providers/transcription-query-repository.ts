import { TranscriptionDTO } from '../model'

/** Transcription READ port (query side of CQRS). */
export interface TranscriptionQueryRepository {
  findByRecordingQuery(recordingId: string): Promise<TranscriptionDTO | null>
}
