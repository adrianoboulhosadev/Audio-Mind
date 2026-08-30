import { AnnotationRepository, DeleteRecordingAnnotations } from '@annotation/core'

export default class DeleteRecordingAnnotationsController {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute(recordingId: string): Promise<void> {
    await new DeleteRecordingAnnotations(this.repository).execute(recordingId)
  }
}
