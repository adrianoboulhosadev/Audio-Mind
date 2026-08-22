import {
  CompleteRecording,
  FailRecording,
  RecordingRepository,
  StartRecordingSummarization,
  StartRecordingTranscription,
} from '@recording/core'
import { EventPublisher } from 'shared'

/**
 * The pipeline transitions the WORKER drives, in one thin presenter — they share
 * the same two ports and are always called by the same caller, one after the
 * other. Each method still runs its own use case, so every precondition stays
 * in the domain.
 */
export default class AdvanceRecordingController {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async startTranscription(recordingId: string): Promise<void> {
    await new StartRecordingTranscription(this.repository).execute(recordingId)
  }

  async startSummarization(recordingId: string): Promise<void> {
    await new StartRecordingSummarization(this.repository).execute(recordingId)
  }

  async complete(recordingId: string): Promise<void> {
    await new CompleteRecording(this.repository, this.eventPublisher).execute(recordingId)
  }

  async fail(recordingId: string, reason: string): Promise<void> {
    await new FailRecording(this.repository, this.eventPublisher).execute({ recordingId, reason })
  }
}
