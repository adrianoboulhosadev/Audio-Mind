import { AnnotationRepository, DeleteAnnotation } from '@annotation/core'

export default class DeleteAnnotationController {
  constructor(private readonly repository: AnnotationRepository) {}

  async execute(annotationId: string, ownerId: string): Promise<void> {
    await new DeleteAnnotation(this.repository).execute({ annotationId, ownerId })
  }
}
