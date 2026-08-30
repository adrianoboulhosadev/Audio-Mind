import { UseCase } from 'shared'
import { AnnotationRepository } from '../providers'

/** Drops every mark on a recording. Idempotent, and part of the app layer's
 * delete cascade — a mark pointing at a second of an audio that no longer
 * exists points at nothing. */
export default class DeleteRecordingAnnotations implements UseCase<string, void> {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute(recordingId: string): Promise<void> {
    await this.repository.deleteByRecording(recordingId)
  }
}
