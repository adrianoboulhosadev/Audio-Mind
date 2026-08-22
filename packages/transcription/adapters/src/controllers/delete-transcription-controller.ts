import { DeleteTranscription, TranscriptionRepository } from '@transcription/core'

export default class DeleteTranscriptionController {
  constructor(private readonly repository: TranscriptionRepository) {}

  async execute(recordingId: string): Promise<void> {
    await new DeleteTranscription(this.repository).execute(recordingId)
  }
}
