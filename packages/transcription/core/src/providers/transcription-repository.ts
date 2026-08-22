import { Transcription } from '../model'

/**
 * Transcription WRITE port (command side).
 *
 * `save` must be an UPSERT keyed by recordingId: retrying a recording runs the
 * model again over the same audio, and the second run has to REPLACE the first
 * transcript, not add a second one (the column is unique — the domain only
 * promises one per recording).
 */
export interface TranscriptionRepository {
  save(transcription: Transcription): Promise<void>
  findByRecording(recordingId: string): Promise<Transcription | null>
  deleteByRecording(recordingId: string): Promise<void>
}
