import { UseCase } from 'shared'
import { TranscriptionRepository } from '../providers'

/**
 * Drops the transcript of a recording. Idempotent — deleting what is not there
 * is a no-op, because this runs as part of the app layer's delete cascade
 * (recording -> transcription -> summary) and a recording that failed before
 * being transcribed simply has none.
 */
export default class DeleteTranscription implements UseCase<string, void> {
  constructor(private readonly repository: TranscriptionRepository) {}

  async execute(recordingId: string): Promise<void> {
    await this.repository.deleteByRecording(recordingId)
  }
}
