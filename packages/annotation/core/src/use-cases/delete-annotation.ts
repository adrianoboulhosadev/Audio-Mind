import { UseCase, NotFoundError, Errors } from 'shared'
import { AnnotationRepository } from '../providers'

interface Input {
  annotationId: string
  /** Resolved from the JWT at the HTTP boundary (anti-IDOR). */
  ownerId: string
}

/** Removes one mark. Someone else's answers exactly like a missing one. */
export default class DeleteAnnotation implements UseCase<Input, void> {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute({ annotationId, ownerId }: Input): Promise<void> {
    const annotation = await this.repository.findById(annotationId)
    if (!annotation || annotation.ownerId !== ownerId) {
      NotFoundError.throwError(Errors.ANNOTATION_NOT_FOUND, annotationId)
    }

    await this.repository.delete(annotationId)
  }
}
