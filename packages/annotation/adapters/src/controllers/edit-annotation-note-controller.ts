import { AnnotationRepository, EditAnnotationNote } from '@annotation/core'

export default class EditAnnotationNoteController {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute(annotationId: string, ownerId: string, note?: string | null): Promise<void> {
    await new EditAnnotationNote(this.repository).execute({ annotationId, ownerId, note })
  }
}
