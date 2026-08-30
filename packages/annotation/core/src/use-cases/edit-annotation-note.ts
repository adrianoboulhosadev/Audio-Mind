import { UseCase, NotFoundError, Errors } from 'shared'
import { AnnotationRepository } from '../providers'

interface Input {
  annotationId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
  note?: string | null
}

/**
 * Rewrites what a mark says. Someone else's mark answers exactly like a missing
 * one — a mark quotes a moment of a private recording.
 *
 * Clearing the text leaves the mark standing (see `Annotation.editNote`): the
 * person still asked to remember that second.
 */
export default class EditAnnotationNote implements UseCase<Input, void> {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute({ annotationId, ownerId, note }: Input): Promise<void> {
    const annotation = await this.repository.findById(annotationId)
    if (!annotation || annotation.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.ANNOTATION_NOT_FOUND, annotationId)
    }

    annotation.editNote(note)
    await this.repository.update(annotation)
  }
}
